# React Development Server in Docker - Troubleshooting Guide

## Common Issues and Solutions

### 1. Connection Reset / Can't Access Frontend

**Symptoms:**
- Browser shows "connection reset" or "can't connect" 
- `curl http://localhost:3000` fails or times out
- Frontend container shows as running but not accessible

**Root Causes:**
1. **Memory Limit Too Low**: React dev server with hot reloading needs 1.5-2GB
2. **Network Binding**: Dev server binds to localhost (127.0.0.1) instead of 0.0.0.0
3. **Missing Environment Variables**: React dev server configuration

**Solutions:**

```yaml
# docker-compose.yml
services:
  client:
    environment:
      - HOST=0.0.0.0              # Bind to all interfaces
      - WATCHPACK_POLLING=true    # Use polling for file watching
    deploy:
      resources:
        limits:
          memory: 2G              # Minimum 1.5G for React dev
          cpus: '1.0'
```

### 2. Build Failures / Out of Memory

**Symptoms:**
- "The build failed because the process exited too early"
- "system ran out of memory"
- Container keeps restarting

**Solution:**
Increase memory allocation in docker-compose.yml:

```yaml
deploy:
  resources:
    limits:
      memory: 2G    # For development builds
      # memory: 4G  # For larger projects with many dependencies
```

### 3. Hot Reloading Not Working

**Symptoms:**
- File changes don't trigger rebuilds
- Need to manually refresh browser
- "Waiting for file changes" but nothing happens

**Solutions:**

```yaml
# docker-compose.yml
environment:
  - WATCHPACK_POLLING=true        # Enable polling
  - CHOKIDAR_USEPOLLING=true     # Fallback for older versions
volumes:
  - ./client:/app
  - /app/node_modules             # Prevent node_modules override
```

### 4. Slow Startup Times

**Symptoms:**
- Takes 3+ minutes to start
- Health checks failing
- "Starting the development server..." hangs

**Optimizations:**

```yaml
# Increase startup grace period
healthcheck:
  start_period: 60s    # Give more time for initial startup

# Optimize volume mounts
volumes:
  - ./client:/app:cached         # Use cached mount on macOS
  - /app/node_modules           # Exclude node_modules
```

### 5. Production vs Development Images

**Development Configuration:**
```dockerfile
# Use development target
FROM node:18-alpine AS development
# Install all dependencies including devDependencies
RUN npm ci
# Expose development port
EXPOSE 3000
CMD ["npm", "start"]
```

**Production Configuration:**
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
RUN npm ci && npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
```

## Environment Variables Reference

| Variable | Purpose | Default | Recommended |
|----------|---------|---------|-------------|
| `HOST` | Bind address | localhost | 0.0.0.0 |
| `PORT` | Server port | 3000 | 3000 |
| `WATCHPACK_POLLING` | File watching | false | true |
| `CHOKIDAR_USEPOLLING` | Legacy file watching | false | true |
| `GENERATE_SOURCEMAP` | Source maps | true | true (dev) |

## Quick Diagnostic Commands

```bash
# Check container status
docker compose ps

# View detailed logs
docker compose logs client --follow

# Check memory usage
docker stats --no-stream

# Test network connectivity
curl -I http://localhost:3000

# Check processes in container
docker compose exec client ps aux

# Check port binding
docker compose exec client netstat -tlnp
```

## Best Practices for React + Docker

1. **Memory Allocation**: Start with 2G, adjust based on project size
2. **File Watching**: Always enable polling in containers
3. **Network Binding**: Use HOST=0.0.0.0 for accessibility
4. **Volume Mounts**: Exclude node_modules, use bind mounts for source
5. **Health Checks**: Allow sufficient startup time (30-60s)
6. **Production Builds**: Use multi-stage builds with nginx
7. **Environment Variables**: Properly configure for container environment

## Production Deployment Notes

For production, switch to the production target:

```yaml
# docker-compose.prod.yml
services:
  client:
    build:
      target: production    # Use nginx-based production build
    ports:
      - "80:80"
    deploy:
      resources:
        limits:
          memory: 128M      # Much smaller for static files
```

---
Last Updated: $(date)
Project: Restaunax Docker Optimization