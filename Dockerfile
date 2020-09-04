FROM node:latest

RUN mkdir -p /src

WORKDIR /src

COPY package.json

RUN npm install

COPY ..

EXPOSE 300

CMD ["npm", "start"]
