# Multi-stage build for optimized Node.js backend
# Stage 1: Base image with dependencies
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache openssl dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

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

# Copy built application
COPY --from=development --chown=nodejs:nodejs /app /app

# Remove development dependencies
RUN npm prune --production && npm cache clean --force

# Switch to non-root user
USER nodejs

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]