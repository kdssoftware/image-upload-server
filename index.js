require('dotenv').config()
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Jimp = require('jimp');

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

app.options('/', cors({origin:['http://localhost:3000', 'https://picturehouse.be']}))

app.post('/',async (req,res)=>{
    await multerAny(req, res);
    const blobs = req.files;
    let urls = [];
    let uploads = [];
    for await (const blob of blobs) {
        const uuidFull = uuidv4();
        const file = uuidFull+"."+blob.mimetype.split('/')[1];
        const imagePathPrivateFull = path.resolve(__dirname,'images/',uuidFull+"."+blob.mimetype.split('/')[1]);
        const imagePathPublicFull = `${process.env.HOST}/${uuidFull+"."+blob.mimetype.split('/')[1]}`;
        await fs.writeFileSync(imagePathPrivateFull, blob.buffer);
        console.log("saved file "+imagePathPrivateFull);
        const image = await Jimp.read(imagePathPrivateFull);
        console.log(image._exif.tags);
        let width = image.getWidth();
        let height =image.getHeight();
        uploads.push({
            path:imagePathPrivateFull,
            file:file
        });
        delete blob.buffer;
        urls.push({
            url:imagePathPublicFull,
            file:uuidFull+"."+blob.mimetype.split('/')[1],
            width,
            height,
            ...blob,
            uploadDate:Date.now(),
            exif_tags:image._exif.tags
        });
    }
    res.status(201).send(urls);
    
    //after uploading image we need to blur and compress it
    for await (const upload of uploads) {
        crop(await Jimp.read(upload.path),path.resolve(__dirname, "images","cropped-"+upload.file));
        compress(await Jimp.read(upload.path),path.resolve(__dirname, "images","compressed-"+upload.file));
        blur(await Jimp.read(upload.path),path.resolve(__dirname, "images","blur-"+upload.file));
        
    }
});

app.get('/:filename', async (req,res)=>{
    try{
        let file = path.resolve(__dirname,'images/',escapeHtml(req.params.filename));
        switch(req.params.filename.split('-')[0]) {
            case 'cropped':
            case 'compressed':
            case 'blur':
               let originalFilePath = path.resolve(__dirname,'images/',escapeHtml(getOriginalFile(req.params.filename)));
                if(!fs.existsSync(file)){
                    if(!fs.existsSync(originalFilePath)){
                        console.log("file "+req.params.filename+" not found");
                        res.status(404).send('File not found');
                        return;
                    }else{
                        //create the file
                        let tempfile;
                        let fileExtension = req.params.filename.split('.')[req.params.filename.split('.').length-1];
                        let tempfilePath = path.resolve(__dirname,'images/',uuidv4()+"."+fileExtension);
                        let jimpImage = await Jimp.read(originalFilePath);
                        console.log("file '"+escapeHtml(req.params.filename)+"' not yet created, creating a new one at "+path.resolve(__dirname, "images/",req.params.filename));
                        switch(req.params.filename.split('-')[0]) {
                            case 'cropped':
                                tempfile = await crop(jimpImage,path.resolve(__dirname, "images/",req.params.filename));
                                break;
                            case 'compressed':
                                tempfile = await compress(jimpImage,path.resolve(__dir__dirname, "images/",req.params.filename));
                                break;
                            case 'blur':
                                tempfile = await blur(jimpImage,path.resolve(__dirname, "images/",req.params.filename));
                                break;
                        }
                        res.sendFile(path.resolve(__dirname, "images/",req.params.filename), function (err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                }else{
                    res.sendFile(file, function (err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
                break;
            default:
                if(!fs.existsSync(file)){
                    res.status(404).send('File not found');
                    return;
                }
                res.sendFile(file, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
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

app.listen(process.env.PORT,()=>{
    console.log(`Server ${process.env.HOST} running on port ${process.env.PORT}`);
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

async function blur(jimpImage, imagePathPrivate){
    let square = Math.min(jimpImage.getWidth(),jimpImage.getHeight());
    await jimpImage.crop(jimpImage.getWidth()<=square?0:((jimpImage.getWidth()-square)/2) ,jimpImage.getHeight()<=square?0:((jimpImage.getHeight()-square)/2) , square, square);
    await jimpImage.quality(20);
    await jimpImage.blur(50);
    await jimpImage.writeAsync(imagePathPrivate);
    console.log(`created blur image from ${imagePathPrivate}`);
    return imagePathPrivate;
}
async function compress(jimpImage, imagePathPrivate){
    await jimpImage.quality(30);
    await jimpImage.writeAsync(imagePathPrivate);
    console.log(`created compress image from ${imagePathPrivate}`);
    return imagePathPrivate;
}
async function crop(jimpImage, imagePathPrivate){
    let square = Math.min(jimpImage.getWidth(),jimpImage.getHeight());
    await jimpImage.quality(30);
    await jimpImage.crop(jimpImage.getWidth()<=square?0:((jimpImage.getWidth()-square)/2) ,jimpImage.getHeight()<=square?0:((jimpImage.getHeight()-square)/2) , square, square);
    await jimpImage.writeAsync(imagePathPrivate);
    console.log(`created crop image from ${imagePathPrivate}`);
    return imagePathPrivate;
}
let getOriginalFile = (file) => {
    let filesplit = file.split('-');
    filesplit.shift();
    return filesplit.join('-');
}