const canvas = document.getElementById("mapCanvas"); 
const context = canvas.getContext("2d");

const sourceImage = new Image();
sourceImage.src = "svg/tree.svg"; 

const maskImage = new Image();
maskImage.src = "svg/area.svg";

const sourceWidth='100';
const sourceHeight='100';
const sourceAmount = 201;

function generateRandom(maxLimit = 1000){
    let rand = Math. random() * maxLimit;
    console. log(rand); 
    
    rand = Math. floor(rand); 
    return rand;
    }

// Ensure both images are loaded
sourceImage.onload = function () {
  maskImage.onload = function () {
    
    // draw source
    for (let i = 0; i < sourceAmount; i++){
        const x = generateRandom();
        const y = generateRandom();

        const dx = Math.abs(x - 500);
        const dy = Math.abs(y - 250);
        const r = Math.sqrt(dx*dx + dy*dy);

        if (r<500){
            context.drawImage(sourceImage, x, y, sourceWidth, sourceHeight);  
        }
        
    }

    // apply mask via source-in and reset composite operation to default ("source-over")
    context.globalCompositeOperation = "source-in";
    context.drawImage(maskImage, 0, 0, );
    context.globalCompositeOperation = "source-over";
  };
};