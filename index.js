require('dotenv').config()
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Jimp = require('jimp');
const jo = require('jpeg-autorotate');
const upload = multer();

const HOST = process.env.HOST

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

app.get('/healtz',(req,res)=>{
    console.log("GET /healthz")
    console.log("wow")
    res.send("OK")
})

app.options('*', cors())

app.post('/',async (req,res)=>{
    console.log("POST / ")
    res.header("Access-Control-Allow-Origin", process.env.CORS || HOST);
    await multerAny(req, res);
    if(req.files){
        const blobs = req.files;
        let urls = [];
        let uploads = [];
        for await (const blob of blobs) {
            const uuidFull = uuidv4();
            const file = uuidFull+"."+blob.mimetype.split('/')[1];
            const imagePathPrivateFull = path.resolve(__dirname,'images/',"save-"+uuidFull+"."+blob.mimetype.split('/')[1]);
            const imagePathPublicFull = `${HOST}/${uuidFull+"."+blob.mimetype.split('/')[1]}`;
            await fs.writeFileSync(imagePathPrivateFull, blob.buffer);
            const image = await Jimp.read(imagePathPrivateFull);
            
            let width = image.getWidth();
            let height =image.getHeight();
            await compress(await Jimp.read(imagePathPrivateFull),path.resolve(__dirname, "images",file));
            await fs.unlinkSync(imagePathPrivateFull)
            if(blob && blob.buffer){
                delete blob.buffer;
            }
            if(image?._exif?.tags && image?._exif?.tags["undefined"] ){
                delete image._exif.tags["undefined"];
            }
            
            urls.push({
                url:imagePathPublicFull,
                file:uuidFull+"."+blob.mimetype.split('/')[1],
                width,
                height,
                ...blob,
                uploadDate:Date.now(),
                exif_tags:image._exif?.tags
            });
        }
        res.status(201).send(urls);
        
    //  after uploading image we need to blur and compress it
    //  for await (const upload of uploads) {
    //         crop(await Jimp.read(upload.path),path.resolve(__dirname, "images","cropped-"+upload.file));
    //         blur(await Jimp.read(upload.path),path.resolve(__dirname, "images","blur-"+upload.file)); 
    //  }
    }else{
        es.status(201).send("No files got. put in body as 'files[]'");
    }
});

app.get('/:filename', async (req,res)=>{
    console.log("GET /"+req.params.filename+" ",req.query)
    res.header("Access-Control-Allow-Origin", process.env.CORS || HOST);
    try{
        let file = path.resolve(__dirname,'images/',escapeHtml(req.params.filename));
        switch(req.params.filename.split('-')[0]) {
            case 'cropped':
            case 'compressed':
            // case 'blur':
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
                                tempfile = await compress(jimpImage,path.resolve(__dirname, "images/",req.params.filename));
                                break;
                            case 'blurred':
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
    console.log("GET / ",req.query)
    res.status(405).send('Method not allowed');
});

app.listen(8181,()=>{
    console.log(`server listening on port 8181`);
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

async function blur(jimpImage, imagePathPrivate){
    let square = Math.min(jimpImage.getWidth(),jimpImage.getHeight());
    await jimpImage.crop(jimpImage.getWidth()<=square?0:((jimpImage.getWidth()-square)/2) ,jimpImage.getHeight()<=square?0:((jimpImage.getHeight()-square)/2) , square, square);
    await jimpImage.quality(20);
    await jimpImage.blur(50);
    autoRotate(jimpImage,imagePathPrivate);
    await jimpImage.writeAsync(imagePathPrivate);
    console.log(`created blur image from ${imagePathPrivate}`);
    return imagePathPrivate;
}

async function compress(jimpImage, imagePathPrivate){
    await jimpImage.quality(40);
    await autoRotate(jimpImage);
    await jimpImage.writeAsync(imagePathPrivate);
    console.log(`created compress image from ${imagePathPrivate}`);
    return imagePathPrivate;
}

async function crop(jimpImage, imagePathPrivate){
    let square = Math.min(jimpImage.getWidth(),jimpImage.getHeight());
    await jimpImage.quality(40);
    await jimpImage.crop(jimpImage.getWidth()<=square?0:((jimpImage.getWidth()-square)/2) ,jimpImage.getHeight()<=square?0:((jimpImage.getHeight()-square)/2) , square, square);
    await autoRotate(jimpImage);
    await jimpImage.writeAsync(imagePathPrivate);
    console.log(`created crop image from ${imagePathPrivate}`);
    return imagePathPrivate;
}

let getOriginalFile = (file) => {
    let filesplit = file.split('-');
    filesplit.shift();
    return filesplit.join('-');
}

let autoRotate = async (JimpImage) =>{
    switch(JimpImage?._exif?.tags?.Orientation){
        case 2:
            await JimpImage.flip(true,false);
            break;
        case 3:
            await JimpImage.rotate(180);
            break;
        case 4:
            await JimpImage.rotate(180).flip(true,false);
            break;
        case 5:
            await JimpImage.rotate(-90).flip(true,false);
            break;
        case 6:
            await JimpImage.rotate(90);
            break;
        case 7:
            await JimpImage.rotate(-90).flip(true,false);
            break;
        case 8:
            await JimpImage.rotate(-90);
            break;
        default:
            break;
    }
}