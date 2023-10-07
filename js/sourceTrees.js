const image = new Image();
image.src = 'svg/tree.svg';
const width='100';
const height='100';
const amountOfTrees = 201;

const canvas = document.getElementById('mapCanvas');
const context = canvas.getContext('2d');

function generateRandom(maxLimit = 1000){
    let rand = Math. random() * maxLimit;
    console. log(rand); 
    
    rand = Math. floor(rand); 
    return rand;
    }

image.onload = function () {

    for (let i = 0; i < amountOfTrees;i++){
        const x = generateRandom();
        const y = generateRandom();

        const dx = Math.abs(x - 500);
        const dy = Math.abs(y - 250);
        const r = Math.sqrt(dx*dx + dy*dy);

        if (r<500){
            context.drawImage(image, x, y, width, height);  
        }
        
    }
    
};



