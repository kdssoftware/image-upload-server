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
    Get a picture by full size
    
    Response:
    The picture in Binary

- `GET /[type]/[filename]`
    Get a picture by type specified
    
    There are 4 types: 
    - __compressed__: 
        reduces the quality of the image to 30%
    - __blur__:
        ads a blur to the picture and reduces to image to 15%
    - __cropped__:
        crops the picture to a square and reduces the image to 30%
    - __full__:
        is the same quality as the picture when it was uploaded.

    example of request: 
    
    `http://localhost:3000/cropped/05b98fa9-c59c-429b-b911-32d9d96d2e0b.jpeg`

    Response:
    The picture in Binary