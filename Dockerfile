FROM node:18.16-alpine

WORKDIR /usr/src/app

COPY ./package*.json ./
COPY index.js settings.json ./

RUN npm install