const canvas = document.getElementById("mapCanvas");
canvas.style.backgroundImage = 'url("./terrain-textures/ground-brown.svg")';
const ctx = canvas.getContext("2d");

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const chunkSize = 0.8;

const noise = new Noise(Math.random());

for (let x = 0; x < canvasWidth; x += chunkSize) {
  for (let y = 0; y < canvasHeight; y += chunkSize) {
    const noiseValue = noise.simplex2(x / 100, y / 100);
    let color;
    if (noiseValue < -0.8) color = "red";
    else if (noiseValue < 0) color = "#00000000";
    else color = "blue";
    ctx.fillStyle = color;
    ctx.fillRect(x, y, chunkSize, chunkSize);
  }
}
