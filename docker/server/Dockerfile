FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

# Set Prisma binary target for Alpine
ENV PRISMA_BINARY_TARGET=linux-musl

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "run", "dev"]