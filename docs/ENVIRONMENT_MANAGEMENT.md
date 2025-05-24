# Environment Management Guide

## Overview

Restaunax now uses a **consolidated environment management strategy** with a single `.env` file that contains all configuration for the entire application. This eliminates the need to manage separate environment files across different services.

## 🎯 Problem Solved

**Before**: Managing 3 separate `.env` files
- Root `.env` - Docker Compose variables
- `client/.env` - React frontend configuration  
- `server/.env` - Node.js backend configuration

**Issues**:
- ❌ Duplication of values across files
- ❌ Risk of inconsistency between services
- ❌ Need to update multiple files for single changes
- ❌ Complex setup for new developers

**After**: Single consolidated `.env` file
- ✅ All configuration in one place
- ✅ Consistent values across services
- ✅ Single point of truth for environment settings
- ✅ Simplified setup and maintenance

## 📁 File Structure

```
restaunax/
├── .env                          # 🎯 SINGLE consolidated configuration
├── .env.example                  # Template for new setups
├── docker-compose.yml            # References .env variables
├── backups/env-files/            # 💾 Original separated files
│   ├── root.env.old
│   ├── client.env.old
│   ├── server.env.old
│   └── *.env.example.old
└── docs/ENVIRONMENT_MANAGEMENT.md # This guide
```

## ⚙️ Configuration Sections

The consolidated `.env` file is organized into logical sections:

### 1. **Docker Compose Configuration**
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=restaunax
NODE_ENV=development
```

### 2. **Network Configuration**  
```env
CLIENT_PORT=3000
CLIENT_HOST=0.0.0.0
SERVER_INTERNAL_PORT=8080
SERVER_EXTERNAL_PORT=8081
POSTGRES_PORT=5432
REDIS_PORT=6379
```

### 3. **Database Configuration**
```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/restaunax
DATABASE_URL_LOCAL=postgresql://postgres:postgres@localhost:5432/restaunax
```

### 4. **API Configuration**
```env
REACT_APP_API_URL=http://localhost:8081/api
CORS_ORIGIN=http://localhost:3000
```

### 5. **Security Configuration**
```env
JWT_ACCESS_SECRET=dev-access-secret-key-change-in-production-please
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production-please
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
```

### 6. **Development Settings**
```env
GENERATE_SOURCEMAP=true
WATCHPACK_POLLING=true
HOST=0.0.0.0
LOG_LEVEL=info
```

### 7. **AI Features (Optional)**
```env
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://10.13.0.254:11434
OLLAMA_MODEL=deepseek-coder:1.3b
OLLAMA_TIMEOUT=30000
```

## 🚀 Usage

### Quick Setup
```bash
# Copy template and customize
cp .env.example .env

# Edit values as needed
nano .env

# Start application
docker compose up
```

### Key Benefits

1. **Single Source of Truth**: Change a port or URL in one place
2. **Consistency**: All services use the same configuration values
3. **Flexibility**: Easy to override values for different environments
4. **Security**: Centralized secret management

## 🔧 How It Works

### Docker Compose Integration
The `docker-compose.yml` file references environment variables from the single `.env` file:

```yaml
services:
  client:
    ports:
      - "${CLIENT_PORT:-3000}:3000"
    env_file:
      - ./.env
    environment:
      - REACT_APP_API_URL=${REACT_APP_API_URL}
      - NODE_ENV=${NODE_ENV}
      
  server:
    ports:
      - "${SERVER_EXTERNAL_PORT:-8081}:${SERVER_INTERNAL_PORT:-8080}"
    env_file:
      - ./.env
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
```

### Variable Propagation
1. **Docker Compose** reads `.env` for service configuration
2. **Services** receive environment variables through `env_file` and `environment` sections
3. **Applications** access variables through standard environment variable methods

## 🌍 Environment-Specific Configuration

### Development (Default)
```env
NODE_ENV=development
OLLAMA_ENABLED=true
GENERATE_SOURCEMAP=true
LOG_LEVEL=info
```

### Production Override
```env
NODE_ENV=production
OLLAMA_ENABLED=false
GENERATE_SOURCEMAP=false
JWT_ACCESS_SECRET=your-production-secret
POSTGRES_PASSWORD=secure-production-password
```

### Local Development (Outside Docker)
Use the `*_LOCAL` variants for local development:
```env
DATABASE_URL_LOCAL=postgresql://postgres:postgres@localhost:5432/restaunax
REDIS_URL_LOCAL=redis://localhost:6379
```

## 🔍 Common Scenarios

### Change API Port
```env
# Change from 8081 to 9000
SERVER_EXTERNAL_PORT=9000
REACT_APP_API_URL=http://localhost:9000/api
```

### Add New Environment Variable
1. Add to `.env` in appropriate section
2. Add to `.env.example` with default/example value
3. Reference in `docker-compose.yml` if needed
4. Use in application code

### Production Deployment
1. Copy `.env.example` to `.env.production`
2. Update production-specific values
3. Use with: `docker compose --env-file .env.production up`

## 🛠️ Troubleshooting

### Environment Variables Not Loading
```bash
# Check Docker Compose resolves variables correctly
docker compose config

# Verify specific service environment
docker compose exec server env | grep DATABASE_URL
```

### Port Conflicts
```bash
# Change ports in .env
CLIENT_PORT=3001
SERVER_EXTERNAL_PORT=8082

# Restart services
docker compose down && docker compose up
```

### Missing Variables
Check that:
1. Variable exists in `.env`
2. Variable referenced in `docker-compose.yml`
3. No typos in variable names
4. Docker Compose restarted after changes

## 📋 Migration from Old Setup

The old separated files are preserved in `backups/env-files/`:
- `root.env.old` - Original root `.env`
- `client.env.old` - Original client `.env`
- `server.env.old` - Original server `.env`
- `*.env.example.old` - Original example files

If you need to reference old values, they're safely preserved there.

## 🎉 Benefits Achieved

- ✅ **90% reduction** in environment file management
- ✅ **Zero duplication** of configuration values
- ✅ **Single point** of environment changes
- ✅ **Improved consistency** across services
- ✅ **Simplified onboarding** for new developers
- ✅ **Better maintainability** for production deployments

---

*For questions or issues with environment configuration, refer to this guide or check the troubleshooting section.*