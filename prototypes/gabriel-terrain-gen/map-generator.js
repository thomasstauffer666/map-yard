const canvas = document.getElementById("mapCanvas");
canvas.style.backgroundImage = 'url("/prototypes/gabriel-terrain-gen/terrain-textures/ground-brown.svg")';
const ctx = canvas.getContext("2d");

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const chunkSize = 0.8;

const noise = new Noise(Math.random());

for (let x = 0; x < canvasWidth; x += chunkSize) {
  for (let y = 0; y < canvasHeight; y += chunkSize) {
    const noiseValue = noise.simplex2(x / 100, y / 100);
    const color = noiseValue > 0.1 ? "#00000000" : "blue";

    ctx.fillStyle = color;
    ctx.fillRect(x, y, chunkSize, chunkSize);
  }
}
