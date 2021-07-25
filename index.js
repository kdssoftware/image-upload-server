require('dotenv').config()
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

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
   if(!req?.files?.length){
        res.status(400).send('No file was uploaded');
        res.end();
        return;
   }else{
        const blobs = req.files;
        const uuid = uuidv4();
        const imagesData= blobs.map((blob)=>{
            console.log(blob);
            const imagePathPrivate = path.resolve(__dirname, "images",uuid+"."+blob.mimetype.split('/')[1]);
            const imagePathPublic = `${process.env.HOST}/${uuid+"."+blob.mimetype.split('/')[1]}`;
            console.log(imagePathPrivate,imagePathPublic);
            fs.writeFileSync(imagePathPrivate, blob.buffer);
            res.status(201).send(imagePathPublic);
            res.end();
            return;
          });
   }
});

app.get('/:filename',(req,res)=>{
    console.log(path.resolve(__dirname,'images/',req.params.filename));
    res.sendFile(path.resolve(__dirname,'images/',req.params.filename));
});

app.listen(4000,()=>{
    console.log(`Server running on port 4000`);
})