const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const chunkSize = 1;

const noise = new Noise(Math.random());

for (let x = 0; x < canvasWidth; x += chunkSize) {
  for (let y = 0; y < canvasHeight; y += chunkSize) {
    const noiseValue = noise.simplex2(x / 100, y / 100);
    console.log(noiseValue);
    const color = noiseValue > 0.5 ? "blue" : "#fff555";

    ctx.fillStyle = color;
    ctx.fillRect(x, y, chunkSize, chunkSize);
  }
}
