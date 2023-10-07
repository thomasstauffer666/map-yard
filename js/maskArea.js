
// const canvas = document.getElementById('myCanvas');
// const context = canvas.getContext('2d');
// const image = new Image();

image.src = 'svg/area.svg'; 

image.onload = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const binaryMatrix = [];

   
    for (let y = 0; y < canvas.height; y++) {
        const row = [];
        for (let x = 0; x < canvas.width; x++) {
            const pixelIndex = (y * canvas.width + x) * 4;
            const r = imageData.data[pixelIndex];
            const g = imageData.data[pixelIndex + 1];
            const b = imageData.data[pixelIndex + 2];
            const isBlack = r === 0 && g === 0 && b === 0 ? 1 : 0;

            if(isBlack){
              context.clearRect(x, y, 1, 1); // Clear 1x1 pixel area at (x, y)
            }

            row.push(isBlack);
        }
        binaryMatrix.push(row);
    }

    // Now 'binaryMatrix' contains your binary matrix.
    console.log(binaryMatrix);
};



