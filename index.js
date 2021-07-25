require('dotenv').config()
const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

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
        const uuid = uuidv4();  
        const imagePathPrivate = path.resolve(__dirname, "images",uuid+"."+blob.mimetype.split('/')[1]);
        const imagePathPublic = `${process.env.HOST}/${uuid+"."+blob.mimetype.split('/')[1]}`;
        fs.writeFileSync(imagePathPrivate, blob.buffer);
        urls.push(imagePathPublic);
        console.log(`new file added: ${imagePathPublic}`);
    }
    res.status(201).send(urls);
    res.end();
    return;
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
        res.sendFile(path.resolve(__dirname,'images/',escapeHtml(req.params.filename)));
        
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

//http://nas.karel.be:40371/69c4916e-856e-4154-8744-460683d451be.jpeg