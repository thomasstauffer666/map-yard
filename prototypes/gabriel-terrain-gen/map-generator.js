const canvas = document.getElementById("mapCanvas");
canvas.style.backgroundColor = "radial-gradient(circle, #FDF5E6, #F5DEB3, #8B4513, #8B4513)";
const ctx = canvas.getContext("2d");

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const chunkSize = 1;

const noise = new Noise(Math.random());
const img = new Image();
img.src = "./terrain-textures/berg.svg";
let spacing = 0;

img.onload = function () {
  for (let x = 0; x < canvasWidth; x += chunkSize) {
    for (let y = 0; y < canvasHeight; y += chunkSize) {
      const noiseValue = noise.simplex2(x / 300, y / 300);
      let color;
      if (noiseValue <= -0.8) {
        if (spacing > 2000) {
          ctx.drawImage(img, x, y, 100, 100);
          spacing = 0;
        } else {
          spacing++;
        }
      } else if (noiseValue < 0.7) {
        color = "#00000000";
      } else {
        color = "blue";
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, chunkSize, chunkSize);
    }
  }
};
