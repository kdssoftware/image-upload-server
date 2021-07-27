# picturehouse-images
small dynamic file server for images used in picturehouse.be (https://github.com/snakehead007/picturehouse)

### Docker usage

Pulling:
```bash
docker pull ghcr.io/snakehead007/picturehouse-images:latest
```

running:
```bash
docker run -e HOST=http://test.example.com  -p 80:4000 --name picturehouse-images ghcr.io/snakehead007/picturehouse-images
```

## API endpoints

- `POST / `
    Add new pictures to the server
    
    <i>Where 'files' in the body are sent (in Binary).</i>
    
    Response: 
    ```json
    [
        {
            "url":"http://localhost:3000/05b98fa9-c59c-429b-b911-32d9d96d2e0b.jpeg",
            "file":"05b98fa9-c59c-429b-b911-32d9d96d2e0b.jpeg",
            "width":500,
            "height":700
        }
    ]
    ```

- `GET /[filename]`

    The filename is default `[uuid].[file-exstension]` (example: `05b98fa9-c59c-429b-b911-32d9d96d2e0b.jpeg`)

    To receive an altered file put the type in front of the filename (example `[type]-[filename]`)

    There are 3 types: 
    - __compressed__: 
        reduces the quality of the image to 30%
    - __blur__:
        ads a blur to the picture and reduces to image to 20%
    - __cropped__:
        crops the picture to a square and reduces the image to 30%

    example of request: 
    
    `http://localhost:3000/cropped-05b98fa9-c59c-429b-b911-32d9d96d2e0b.jpeg`
    
    Response:
    The picture in Binary

    <i>Info: the altered files will be automatically created when a new file is uploaded, to ensure the best speed. If the file was not created (for example taking longer to alter the file) it will alter the file on-demand as a temporary file (deleted after 30 seconds of sending)</i>
