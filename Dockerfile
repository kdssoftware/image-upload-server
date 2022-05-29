FROM node:15.12.0-alpine3.13
WORKDIR /app
COPY package.json /app/package.json
RUN mkdir images
RUN yarn install
EXPOSE 8181
COPY . /app
CMD ["yarn", "start"]