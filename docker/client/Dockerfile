# Multi-stage build for optimized React frontend
# Stage 1: Base image with dependencies
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
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

# Copy source code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Stage 3: Build stage for production
FROM base AS builder

# Install all dependencies for building
RUN npm ci && npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs . .

# No build-time environment variables needed - using runtime config

# Build the application
RUN npm run build

# Stage 4: Production build with nginx
FROM nginx:alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY --chown=nginx-user:nginx-user nginx.conf /etc/nginx/nginx.conf

# Create startup script to generate config files and start nginx
COPY <<EOF /start.sh
#!/bin/sh
echo "=== STARTUP SCRIPT EXECUTING ==="
echo "Container environment:"
env | grep REACT_APP || echo "No REACT_APP variables found"
echo "REACT_APP_API_URL value: \${REACT_APP_API_URL:-UNSET}"
echo "Removing old config files..."
rm -f /usr/share/nginx/html/config.js /usr/share/nginx/html/config-override.js
echo "Creating new config files..."
echo "window.CONFIG = { API_URL: \"\${REACT_APP_API_URL:-http://localhost:8081/api}\" };" > /usr/share/nginx/html/config.js
echo "window.CONFIG = { API_URL: \"\${REACT_APP_API_URL:-http://localhost:8081/api}\" };" > /usr/share/nginx/html/config-override.js
echo "Config files created. Contents:"
cat /usr/share/nginx/html/config-override.js
echo "=== STARTING NGINX ==="
exec nginx -g "daemon off;"
EOF

RUN chmod +x /start.sh

# Create nginx pid directory with correct permissions
RUN mkdir -p /var/run/nginx && \
    chown -R nginx-user:nginx-user /var/run/nginx && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown nginx-user:nginx-user /start.sh

# Switch to non-root user
USER nginx-user

EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["/start.sh"]