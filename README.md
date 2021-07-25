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
