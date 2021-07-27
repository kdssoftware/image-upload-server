require('dotenv').config()
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Jimp = require('jimp');

app.use(cors({origin:'*'}));

const upload = multer();

function initMiddleware(middleware) {
    return (req, res) =>
      new Promise((resolve, reject) => {
        middleware(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

const multerAny = initMiddleware(
  upload.any()
);

app.post('/',async (req,res)=>{
    await multerAny(req, res);
    const blobs = req.files;
    let urls = [];
    for await (const blob of blobs) {
        const uuidFull = uuidv4();
        const file = uuidFull+"."+blob.mimetype.split('/')[1];
        const imagePathPrivateFull = await  path.resolve(__dirname, "images",uuidFull+"."+blob.mimetype.split('/')[1]);
        console.log(imagePathPrivateFull);
        const imagePathPublicFull = `${process.env.HOST}/${uuidFull+"."+blob.mimetype.split('/')[1]}`;
        await fs.writeFileSync(imagePathPrivateFull, blob.buffer);
        const image = await Jimp.read(file);
        let width = image.getWidth();
        let height =image.getHeight();

        urls.push({
            url:imagePathPublicFull,
            file:uuidFull+"."+blob.mimetype.split('/')[1],
            width,
            height
        });
    }
    res.status(201).send(urls);
    return;
});

app.get('/:filename', async (req,res)=>{
    try{
        let file = path.resolve(__dirname,'images/',escapeHtml(req.params.filename));
        console.log("finding "+file);
        //check if file exists
        if(!fs.existsSync(file)){
            res.status(404).send('File not found');
            return;
        }
        res.sendFile(file, function (err) {
            if (err) {
                console.log(err);
            }
        });

    }catch(e){
        console.trace(e);
        res.status(500).send("Something went wrong on our end");
        return
    }
});

app.get('/:type/:filename', async (req,res)=>{
    try{
        let file = path.resolve(__dirname,'images/',escapeHtml(req.params.filename));
        //check if file exists
        if(!fs.existsSync(file)){
            res.status(404).send('File not found');
            return;
        }
        const uuid = uuidv4();
        const imagePathPrivate = path.resolve(__dirname, "images",uuid+"."+req.params.filename.split('.')[req.params.filename.split('.').length-1]);
        const image = await Jimp.read(file);
        switch(req.params.type){
            case 'compressed':
                await image.quality(30);
                await image.writeAsync(imagePathPrivate);
                res.sendFile(imagePathPrivate);
                console.log("sending file");
                setTimeout(()=>{
                    fs.unlinkSync(imagePathPrivate);
                },5000);
                break;
            case 'blur':
                await image.quality(15);
                await image.blur(10);
                await image.writeAsync(imagePathPrivate);
                res.sendFile(imagePathPrivate);
                console.log("sending file");
                setTimeout(()=>{
                    fs.unlinkSync(imagePathPrivate);
                },5000);
                break;
            case "cropped":
                //crop image to a square
                let square = Math.min(image.getWidth(),image.getHeight());
                await image.quality(30);
                await image.crop(image.getWidth()<=square?0:((image.getWidth()-square)/2) ,image.getHeight()<=square?0:((image.getHeight()-square)/2) , square, square);
                await image.writeAsync(imagePathPrivate);
                res.sendFile(imagePathPrivate);
                console.log("sending file");
                setTimeout(()=>{
                    fs.unlinkSync(imagePathPrivate);
                },5000);
                break;
            default:
                res.sendFile(file);
        }
        
    }catch(e){
        console.trace(e);
        res.status(500).send("Something went wrong on our end");
        return
    }
});

app.get('/',(req,res)=>{
    res.status(405).send('Method not allowed');
});

app.listen(4000,()=>{
    console.log(`Server running on port 4000`);
})



//function that will check escape html encoding 
function escapeHtml(input) {
    let map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '@': '&#x40;',
        '\\': '&#x5C;',
        '%': '&#x25;',
    };
    return input.replace(/[&<>"'/\\@%]/g, (m) => map[m]);
}

//http://nas.karel.be:40371/69c4916e-856e-4154-8744-460683d451be.jpeg