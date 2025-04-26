let videoStream;
let canvas, texture;
let visionMode = "normal";
let slowMotion = false;

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
            initGlfx();
        };
    } catch (err) {
        console.error('Error accessing camera: ', err);
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

function initGlfx() {
    const video = document.getElementById('videoElement');
    canvas = fx.canvas();
    document.getElementById('glfxCanvas').replaceWith(canvas);

    const render = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            texture = canvas.texture(video);
            texture.loadContentsOf(video);
            let draw = canvas.draw(texture);

            if (visionMode === "night") {
                draw.brightness(0.5).contrast(2).hueSaturation(0.5, 1.5);
            } else if (visionMode === "thermal") {
                draw.invert().hueSaturation(0.7, 2).contrast(1.5);
            }

            draw.update();
        }
        requestAnimationFrame(render);
    };
    render();
}

function toggleNightVision() {
    visionMode = (visionMode === "night") ? "normal" : "night";
    document.getElementById('visionMode').textContent = (visionMode === "night") ? "رؤية ليلية" : "عادية";
}

function toggleThermalVision() {
    visionMode = (visionMode === "thermal") ? "normal" : "thermal";
    document.getElementById('visionMode').textContent = (visionMode === "thermal") ? "رؤية حرارية" : "عادية";
}

function toggleSlowMotion() {
    const video = document.getElementById('videoElement');
    slowMotion = !slowMotion;
    video.playbackRate = slowMotion ? 0.5 : 1.0;
}