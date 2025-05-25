# Multi-stage build for optimized Node.js backend
# Stage 1: Base image with dependencies
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache openssl dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user with host user's UID/GID for proper file permissions
ARG USER_ID=1001
ARG GROUP_ID=1001
RUN addgroup -g ${GROUP_ID} -S nodejs && \
    adduser -S nodejs -u ${USER_ID} -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Development build
FROM base AS development

# Install all dependencies including dev dependencies
RUN npm ci && npm cache clean --force

# Install additional tools for development
RUN apk add --no-cache bash docker-cli

# Copy source code
COPY --chown=nodejs:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs && \
    chmod -R 755 /app/logs

# Set Prisma binary target for Alpine
ENV PRISMA_BINARY_TARGET=linux-musl

# Generate Prisma client
RUN npx prisma generate

# Switch to non-root user
USER nodejs

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]

# Stage 3: Production build
FROM base AS production

# Copy source code directly (not from development stage)
COPY --chown=nodejs:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs && \
    chmod -R 755 /app/logs

# Set Prisma binary target for Alpine
ENV PRISMA_BINARY_TARGET=linux-musl

# Generate Prisma client
RUN npx prisma generate

# Switch to non-root user
USER nodejs

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Debug: Show what's actually in the container
RUN echo "=== DEBUG: Contents of package.json ===" && \
    cat package.json && \
    echo "=== DEBUG: Scripts section ===" && \
    grep -A 10 '"scripts"' package.json && \
    echo "=== DEBUG: Files in /app ===" && \
    ls -la /app && \
    echo "=== DEBUG: Contents of scripts directory ===" && \
    ls -la scripts/ || echo "scripts directory not found"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "echo '=== RUNTIME DEBUG: Current package.json ===' && cat package.json && echo '=== RUNTIME DEBUG: Scripts section ===' && grep -A 10 '\"scripts\"' package.json && echo '=== RUNTIME DEBUG: Current working directory ===' && pwd && echo '=== RUNTIME DEBUG: Files in current directory ===' && ls -la && echo '=== RUNTIME DEBUG: Starting server ===' && node src/server.js"]