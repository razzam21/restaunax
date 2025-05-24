FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set the port to 3000 explicitly
ENV PORT=3000

# In production, you would build the app here
# RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]