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
    try{
        let file = path.resolve(__dirname,'images/',escapeHtml(req.params.filename));
        //check if file exists
        if(!fs.existsSync(file)){
            res.status(404).send('File not found');
            res.end();
            return;
        }
        res.sendFile(file);
        res.end();
        return;
    }catch(e){
        res.status(500).send("Something went wrong on our end");
        res.end();
        return
    }
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