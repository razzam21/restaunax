FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma, logrotate for log management, and Docker CLI for container monitoring
RUN apk add --no-cache openssl logrotate dcron bash docker-cli

COPY package*.json ./
RUN npm install

# Set Prisma binary target for Alpine
ENV PRISMA_BINARY_TARGET=linux-musl

COPY . .

# Create logs directory and add .gitkeep file
RUN mkdir -p /app/logs && \
    touch /app/logs/.gitkeep && \
    chmod 755 /app/logs && \
    chmod 644 /app/logs/.gitkeep

# Generate Prisma client
RUN npx prisma generate

# Setup logrotate configuration
RUN echo '#!/bin/sh\n/usr/sbin/logrotate /etc/logrotate.d/restaunax' > /etc/periodic/daily/logrotate-restaunax && \
    chmod +x /etc/periodic/daily/logrotate-restaunax

# Create logrotate configuration
RUN echo '/app/logs/*.log {\n\
    daily\n\
    rotate 7\n\
    maxsize 10M\n\
    missingok\n\
    notifempty\n\
    compress\n\
    delaycompress\n\
    create 644 node node\n\
    sharedscripts\n\
    postrotate\n\
        killall -USR1 node 2>/dev/null || true\n\
    endscript\n\
}' > /etc/logrotate.d/restaunax

EXPOSE 8080

# Start crond and then the application
CMD ["sh", "-c", "crond -L /dev/stdout && npm run dev"]