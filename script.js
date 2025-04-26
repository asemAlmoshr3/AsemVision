
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let stream;
let model;
let nightVision = false;
let thermalVision = false;
let totalPeoplePassed = 0;

async function startCamera() {
  const constraints = {
    video: { facingMode: { exact: "environment" } }
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    model = await cocoSsd.load();
    detectFrame();
  } catch (error) {
    console.error("لم يتم العثور على كاميرا خلفية، يتم التبديل للكاميرا الأمامية...");
    startFrontCamera();
  }
}

async function startFrontCamera() {
  const constraints = {
    video: { facingMode: "user" }
  };

  stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  model = await cocoSsd.load();
  detectFrame();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

function enableNightVision() {
  nightVision = true;
  thermalVision = false;
}

function enableThermalVision() {
  thermalVision = true;
  nightVision = false;
}

async function detectFrame() {
  if (!model) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  let predictions = await model.detect(video);
  let people = 0;

  predictions.forEach(pred => {
    if (pred.class === 'person' && pred.score > 0.5) {
      people++;
      let [x, y, width, height] = pred.bbox;
      let suspicious = (height > 300 || width > 200);

      ctx.strokeStyle = suspicious ? 'red' : '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = suspicious ? 'red' : '#00ff00';
      ctx.font = '18px Arial';
      ctx.fillText(suspicious ? 'مريب' : 'طبيعي', x, y > 20 ? y - 5 : y + 15);
    }
  });

  if (people > 0) {
    totalPeoplePassed += people;
  }

  document.getElementById('counter').innerHTML = `
    الأشخاص الظاهرين الآن: ${people}<br>
    الأشخاص الذين مروا إجمالًا: ${totalPeoplePassed}
  `;

  if (nightVision) applyNightVision();
  if (thermalVision) applyThermalVision();

  requestAnimationFrame(detectFrame);
}

function applyNightVision() {
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    avg = Math.min(255, avg * 3);
    data[i] = avg * 0.2;
    data[i + 1] = avg;
    data[i + 2] = avg * 0.2;
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyThermalVision() {
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (avg < 85) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 255;
    } else if (avg < 170) {
      data[i] = 255; data[i + 1] = 165; data[i + 2] = 0;
    } else {
      data[i] = 255; data[i + 1] = 0; data[i + 2] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
