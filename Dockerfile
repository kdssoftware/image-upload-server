FROM node:15.12.0-alpine3.13
WORKDIR /app
COPY package.json /app/package.json
RUN yarn install 
EXPOSE 4000
COPY . /app
CMD ["yarn", "start"]