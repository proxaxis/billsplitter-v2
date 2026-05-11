FROM node:24.12.0

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

CMD ["npm", "run", "dev", "--", "--host"]