let mediaRecorder;
let recordedChunks = [];
let faceModel, objectModel;
let smileCount = 0;
let personCount = 0;

async function startCamera() {
    const video = document.getElementById('videoElement');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        video.srcObject = stream;
        setupRecording(stream);
        detectObjects(video);
        detectSmile(video);
    } catch (err) {
        console.error('Error accessing the camera: ', err);
    }
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
    recordedChunks = [];
    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
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
    video.style.filter = 'brightness(0.5) contrast(2)';
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
    setInterval(async () => {
        const predictions = await objectModel.detect(video);
        let detected = 'لا يوجد';
        personCount = 0;
        for (const prediction of predictions) {
            if (prediction.class === 'person') personCount++;
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

async function detectSmile(video) {
    faceModel = await blazeface.load();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    setInterval(async () => {
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

window.onload = startCamera;