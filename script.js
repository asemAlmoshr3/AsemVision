let videoStream;
let useFrontCamera = false; // نبدأ بالخلفية
let mediaRecorder;
let recordedChunks = [];
let faceModel, objectModel;
let smileCount = 0;
let personCount = 0;
let previousFrame = null;
let motionDetected = false;
let alertPlayed = false;

async function startCamera() {
    const video = document.getElementById('videoElement');
    const constraints = {
        video: { facingMode: useFrontCamera ? 'user' : { exact: 'environment' } },
        audio: true
    };
    try {
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = videoStream;
        setupRecording(videoStream);
        detectObjects(video);
        detectSmile(video);
        startMotionDetection(video);
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

function setupRecording(stream) {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };
    mediaRecorder.onstop = saveRecording;
}

function startRecording() {
    if (mediaRecorder && mediaRecorder.state === "inactive") {
        recordedChunks = [];
        mediaRecorder.start();
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AsemVisionRecording.webm';
    a.click();
    URL.revokeObjectURL(url);
}

function enableNightVision() {
    const video = document.getElementById('videoElement');
    video.style.filter = 'brightness(1.5) contrast(1.8) saturate(1.5)';
}

function enableThermalVision() {
    const video = document.getElementById('videoElement');
    video.style.filter = 'invert(1) hue-rotate(90deg) saturate(2)';
}

function removeFilters() {
    const video = document.getElementById('videoElement');
    video.style.filter = 'none';
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
        let detected = 'لا يوجد';
        personCount = 0;

        for (const prediction of predictions) {
            if (prediction.class === 'person') {
                personCount++;
                context.beginPath();
                context.rect(...prediction.bbox);
                context.lineWidth = 3;
                context.strokeStyle = 'lime';
                context.fillStyle = 'lime';
                context.stroke();
                
                // تقييم الحركة
                const suspicious = motionDetected && !alertPlayed;
                const label = suspicious ? "🚨 مريب" : "👤 عادي";
                context.font = "18px Arial";
                context.fillText(label, prediction.bbox[0], prediction.bbox[1] > 20 ? prediction.bbox[1] - 5 : 10);

                if (suspicious) {
                    playAlertSound();
                    alertPlayed = true; // لا تكرر الصوت أكثر من مرة متتالية
                }
            }
            if (['cat', 'dog', 'person'].includes(prediction.class)) {
                detected = prediction.class === 'person' ? '👤 شخص' :
                           prediction.class === 'cat' ? '🐱 قطة' :
                           '🐶 كلب';
            }
        }

        document.getElementById('currentCount').textContent = personCount;
        document.getElementById('detectedObject').textContent = detected;
    }, 1000);
}

function playAlertSound() {
    const sound = document.getElementById('alertSound');
    sound.play();
}

async function detectSmile(video) {
    faceModel = await blazeface.load();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 480;

    setInterval(async () => {
        if (!videoStream) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const faces = await faceModel.estimateFaces(canvas, false);
        for (const face of faces) {
            if (face.probability && face.probability[0] > 0.90) {
                smileCount++;
                document.getElementById('smileCount').textContent = smileCount;
            }
        }
    }, 2000);
}

function startMotionDetection(video) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    setInterval(() => {
        if (!videoStream) return;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);

        if (previousFrame) {
            let motionPixels = 0;
            for (let i = 0; i < currentFrame.data.length; i += 4) {
                const diff =
                    Math.abs(currentFrame.data[i] - previousFrame.data[i]) +
                    Math.abs(currentFrame.data[i+1] - previousFrame.data[i+1]) +
                    Math.abs(currentFrame.data[i+2] - previousFrame.data[i+2]);
                if (diff > 50) {
                    motionPixels++;
                }
            }
            motionDetected = motionPixels > 10000; // تحسس للحركة
            if (!motionDetected) {
                alertPlayed = false; // إعادة تمكين التنبيه
            }
        }
        previousFrame = currentFrame;
    }, 500);
}