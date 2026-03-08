FROM node:20-alpine3.22
WORKDIR /app
COPY package.json ./
RUN npm install
COPY analyzer.js ./
CMD ["node", "analyzer.js"]