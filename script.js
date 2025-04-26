let videoStream;
let model;
let personCount = 0;
let nightVision = false;

async function startCamera() {
    const video = document.getElementById('videoElement');
    const constraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false
    };
    try {
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = videoStream;
        video.onloadedmetadata = () => {
            video.play();
            loadModel();
        };
    } catch (err) {
        console.error('Error accessing the camera: ', err);
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        const video = document.getElementById('videoElement');
        video.srcObject = null;
    }
}

function toggleNightVision() {
    nightVision = !nightVision;
    const video = document.getElementById('videoElement');
    if (nightVision) {
        video.style.filter = "brightness(2) contrast(1.5) hue-rotate(90deg) saturate(1.5)";
    } else {
        video.style.filter = "none";
    }
}

async function loadModel() {
    model = await cocoSsd.load();
    detectFrame();
}

async function detectFrame() {
    const video = document.getElementById('videoElement');
    const overlay = document.getElementById('overlay');
    const context = overlay.getContext('2d');

    async function render() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            context.clearRect(0, 0, overlay.width, overlay.height);

            const predictions = await model.detect(video);
            personCount = 0;

            predictions.forEach(prediction => {
                if (prediction.class === 'person') {
                    personCount++;
                    context.beginPath();
                    context.rect(...prediction.bbox);
                    context.lineWidth = 2;
                    context.strokeStyle = 'lime';
                    context.stroke();
                    context.font = "16px Arial";
                    context.fillStyle = 'lime';
                    context.fillText("👤", prediction.bbox[0], prediction.bbox[1] > 20 ? prediction.bbox[1] - 5 : 10);
                }
            });

            document.getElementById('currentCount').textContent = personCount;
        }
        requestAnimationFrame(render);
    }
    render();
}