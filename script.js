let videoStream;
let useFrontCamera = false;
let mediaRecorder;
let recordedChunks = [];
let objectModel;
let personCount = 0;
let nightVisionEnabled = false;
let thermalVisionEnabled = false;
let soundEnabled = true;

async function startCamera() {
    const video = document.getElementById('videoElement');
    const constraints = {
        video: { facingMode: useFrontCamera ? 'user' : { exact: 'environment' } },
        audio: false
    };
    try {
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = videoStream;
        detectObjects(video);
    } catch (err) {
        console.error('Error accessing the camera: ', err);
        alert('خطأ في الوصول إلى الكاميرا: ' + err.message);
    }
}

function stopCamera() {
    const video = document.getElementById('videoElement');
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
}

function toggleCamera() {
    stopCamera();
    useFrontCamera = !useFrontCamera;
    startCamera();
}

function toggleAlertSound() {
    soundEnabled = !soundEnabled;
}

function toggleNightVision() {
    const video = document.getElementById('videoElement');
    nightVisionEnabled = !nightVisionEnabled;
    if (nightVisionEnabled) {
        thermalVisionEnabled = false;
        video.style.filter = 'brightness(2.5) contrast(1.7) hue-rotate(90deg) saturate(1.5)';
        document.getElementById('nightVisionStatus').innerText = "🌌 الرؤية الليلية مفعلة";
    } else {
        video.style.filter = 'none';
        document.getElementById('nightVisionStatus').innerText = "🌌 الرؤية الليلية متوقفة";
    }
}

function toggleThermalVision() {
    const video = document.getElementById('videoElement');
    thermalVisionEnabled = !thermalVisionEnabled;
    if (thermalVisionEnabled) {
        nightVisionEnabled = false;
        video.style.filter = 'invert(1) hue-rotate(90deg) saturate(2)';
        document.getElementById('nightVisionStatus').innerText = "🔥 الرؤية الحرارية مفعلة";
    } else {
        video.style.filter = 'none';
        document.getElementById('nightVisionStatus').innerText = "🔥 الرؤية الحرارية متوقفة";
    }
}

async function detectObjects(video) {
    objectModel = await cocoSsd.load();
    const overlay = document.getElementById('overlay');
    const context = overlay.getContext('2d');

    setInterval(async () => {
        if (!videoStream) return;
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        context.clearRect(0, 0, overlay.width, overlay.height);

        const predictions = await objectModel.detect(video);
        personCount = 0;

        for (const prediction of predictions) {
            if (prediction.class === 'person') {
                personCount++;

                context.beginPath();
                context.rect(...prediction.bbox);
                context.lineWidth = 3;
                context.strokeStyle = 'lime';
                context.stroke();
                context.font = "18px Arial";
                context.fillStyle = 'lime';
                context.fillText("👤", prediction.bbox[0], prediction.bbox[1] > 20 ? prediction.bbox[1] - 5 : 10);
            }
        }

        document.getElementById('currentCount').textContent = personCount;
    }, 1000);
}