# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Restaunax is a real-time order management dashboard for restaurants. The system enables wait staff to create and update customer orders and allows managers/owners to monitor order status in real-time, improving restaurant operational efficiency.

The project is built using:
- Backend: Node.js, Express, Prisma, PostgreSQL, Phinx, JWT, bcrypt, sanitize-html
- Frontend: React, Material UI, Axios, React Router, Chart.js
- Deployment: Docker, Docker Compose

## Architecture

The application follows a 4-MVP phased approach:

1. **MVP 1: Order System** - Core functionality for creating, viewing, and updating orders
2. **MVP 2: Login System** - Authentication and role-based authorization
3. **MVP 3: Theming** - Dynamic color theming based on user's restaurant
4. **MVP 4: Reports** - Viewable and downloadable order reports

## Key Technical Requirements

- **Security Focus**: XSS prevention, SQL injection prevention, CORS configuration, authentication and authorization
- **Test-Driven Development**: >80% test coverage for critical paths
- **Responsive Design**: Support for desktop, tablet, and mobile views
- **Database Schema Management**: Using Phinx migrations

## Development Commands

### Docker Setup

```bash
# Start all services
docker compose up

# Start services in detached mode
docker compose up -d

# Rebuild containers (use bake for better performance)
COMPOSE_BAKE=true docker compose up --build

# Rebuild specific service with bake
COMPOSE_BAKE=true docker compose build --no-cache server

# Stop all services
docker compose down
```

### Database Management

```bash
# Run migrations
docker-compose exec backend phinx migrate

# Run seeders to generate mock data
docker-compose exec backend phinx seed:run
```

### Testing

```bash
# Run backend tests
docker-compose exec backend npm test

# Run frontend tests
docker-compose exec frontend npm test

# Run tests with coverage
docker-compose exec backend npm run test:coverage
docker-compose exec frontend npm run test:coverage
```

### Linting

```bash
# Run backend linting
docker-compose exec backend npm run lint

# Run frontend linting
docker-compose exec frontend npm run lint

# Fix linting issues
docker-compose exec backend npm run lint:fix
docker-compose exec frontend npm run lint:fix
```

### GitLab CI/CD Deployment

```bash
# GitLab pipeline deployment (automatic on dev branch push)
# Builds production images and deploys to Unraid server
# Automatically generates secure JWT tokens and database passwords

# Manual pipeline trigger
git push origin dev

# View pipeline status in GitLab CI/CD interface
# Pipeline includes build and deploy stages with health checks
# All secrets are dynamically generated using OpenSSL (512-bit JWT tokens)
```

## Important Data Models

### Order Schema
```json
{
  "id": "string", // UUID
  "restaurantId": "string", // UUID
  "customerName": "string",
  "orderType": "string", // Enum: ["delivery", "pickup"]
  "items": [
    {
      "id": "string", // UUID
      "name": "string",
      "quantity": "number",
      "price": "number"
    }
  ],
  "status": "string", // Enum: ["pending", "preparing", "ready", "delivered"]
  "total": "number",
  "createdAt": "string" // ISO 8601
}
```

### User Schema
```json
{
  "id": "string", // UUID
  "restaurantId": "string", // UUID
  "username": "string",
  "password": "string", // Hashed (bcrypt)
  "role": "string" // Enum: ["wait_staff", "manager", "owner"]
}
```

## Security Guidelines

When working on this codebase:

1. Sanitize all user inputs using sanitize-html to prevent XSS
2. Use Prisma ORM with parameterized queries to prevent SQL injection
3. Implement proper CORS configuration to allow requests only from the frontend's origin
4. Follow JWT authentication best practices with token expiry and refresh tokens
5. Ensure HTTP-only, Secure, SameSite=Strict cookies for sensitive data
6. Implement RBAC (Role-Based Access Control) with proper authorization checks

## Frontend Development Guidelines

### React Context Usage

**Always use the custom hooks instead of importing contexts directly:**

```javascript
// ✅ CORRECT - Use the custom hooks
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { user } = useAuth();
  const { theme } = useTheme();
  // ...
}
```

```javascript
// ❌ INCORRECT - Don't import contexts directly in components
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

function MyComponent() {
  const { user } = useContext(AuthContext); // This will cause import errors
  // ...
}
```

**For testing, contexts are available for mocking:**

```javascript
// ✅ CORRECT - Import contexts for testing
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

// Use in test providers
<AuthContext.Provider value={mockAuthValue}>
  <ThemeContext.Provider value={mockThemeValue}>
    <ComponentUnderTest />
  </ThemeContext.Provider>
</AuthContext.Provider>
```

### ESLint Rules

**Always escape special characters in JSX:**

```javascript
// ✅ CORRECT - Use HTML entities for apostrophes
<Alert>You don&apos;t have permission to access this feature.</Alert>

// ❌ INCORRECT - Unescaped apostrophe
<Alert>You don't have permission to access this feature.</Alert>
```

### Import Organization

**Follow this import order:**
1. React and React-related imports
2. Third-party library imports
3. Material-UI imports
4. Local context hooks (useAuth, useTheme, etc.)
5. Local component imports
6. Local service imports
7. Local utility imports

### Error Prevention Checklist

Before committing frontend code, verify:

- [ ] Use `useAuth()` and `useTheme()` hooks instead of context imports
- [ ] Escape all apostrophes and special characters in JSX text
- [ ] Import order follows the established pattern
- [ ] No direct context imports in components (only in tests)
- [ ] ESLint warnings are resolved

## Backend Development Guidelines

### Service Initialization

**Avoid immediate service instantiation at module level:**

```javascript
// ❌ INCORRECT - Causes server startup issues
class MyService {
  constructor() {
    this.initializeSchedulers(); // Heavy operations on load
  }
}

module.exports = new MyService(); // Instantiated immediately when imported
```

```javascript
// ✅ CORRECT - Export class for lazy initialization
class MyService {
  constructor() {
    this.initializeSchedulers();
  }
}

module.exports = MyService; // Export class, not instance
```

**Use lazy initialization in controllers:**

```javascript
// ✅ CORRECT - Lazy initialization pattern
const MyService = require('../services/my-service');

let serviceInstance = null;
const getService = () => {
  if (!serviceInstance) {
    serviceInstance = new MyService();
  }
  return serviceInstance;
};

// Use getService() instead of direct service calls
const result = await getService().doSomething();
```

### Docker & System Dependencies

**When adding Docker-related dependencies:**

1. Add dependencies to package.json
2. Rebuild containers: `docker compose build --no-cache`
3. Ensure services don't auto-initialize on import
4. Use lazy initialization for resource-intensive services

**For optimal Docker performance:**
- Use `COMPOSE_BAKE=true docker compose build` for faster builds
- React dev server requires minimum 2GB memory in containers
- Always set `HOST=0.0.0.0` for containerized dev servers

### Container-Only Development Rule

**CRITICAL: NEVER run Node.js commands on the host system**

All Node.js commands (npm, node, etc.) MUST be executed inside Docker containers where packages are properly installed. Running Node.js commands on the host system clutters the development environment and may cause dependency conflicts.

```bash
# ✅ CORRECT - Run commands inside containers
docker compose exec server npm test
docker compose exec server node src/server.js

# ❌ INCORRECT - Never run on host system
npm test
node src/server.js
```

### Troubleshooting Server Startup Issues

If server exits immediately with "clean exit":

1. Check for services that instantiate on module load
2. Look for Docker/system operations in constructors
3. Use lazy initialization for heavy services
4. Test route loading inside container: `docker compose exec server node -e "require('./src/routes')"`

### Docker Troubleshooting Resources

For Docker-related issues, refer to:
- `docs/docker/DOCKER_GUIDE.md` - Comprehensive Docker optimization guide
- `docs/docker/REACT_DOCKER_TROUBLESHOOTING.md` - Frontend-specific Docker issues
- `docs/docker/DOCKER_OPTIMIZATION_SUMMARY.md` - Quick reference for common solutions

## AI Features Development Guidelines

Restaunax includes comprehensive AI-powered features for demand forecasting and menu optimization. When working with AI features:

### Menu Optimization Feature

The menu optimization feature provides comprehensive analysis of menu performance using AI-powered insights.

**Key Components:**
- **Backend Service**: `server/src/services/menu-optimization-service.js` - Core business logic
- **Backend Controller**: `server/src/controllers/menu-optimization-controller.js` - API endpoints
- **Frontend Form**: `client/src/components/features/ai/MenuOptimizationForm.js` - User interface for configuration
- **Frontend Viewer**: `client/src/components/features/ai/MenuOptimizationViewer.js` - Results display and analysis

**Data Requirements:**
- Menu items must be linked to order items via `menuItemId` field
- Historical order data (minimum 30 days recommended for meaningful analysis)
- Use the simulation script: `docker compose exec server node scripts/simulate-business-data.js 90`

**Testing:**
- TDD methodology strictly followed with 100% test coverage
- Backend: 37 tests covering service, controller, and integration
- Frontend: 45 tests covering form, viewer, and interactions
- Run tests: `docker compose exec server npm test -- --testPathPattern="menu-optimization"`

**AI Engine Configuration:**
- Supports both OpenAI and Ollama engines
- Engine selection handled transparently by AI abstraction layer
- Configure engines in `.env` file with `OPENAI_API_KEY` or `OLLAMA_ENABLED=true`

### Data Simulation for AI Features

Generate realistic business data for AI analysis:

```bash
# Generate 90 days of realistic restaurant data
docker compose exec server node scripts/simulate-business-data.js 90

# Generate 30 days for testing (faster)
docker compose exec server node scripts/simulate-business-data.js 30
```

**Important**: The simulation script creates proper `menuItemId` linkages essential for menu optimization analysis.

### AI Feature Testing Best Practices

1. **Always verify data linkage**: Ensure order items have proper `menuItemId` connections
2. **Use realistic timeframes**: AI features require sufficient data (30+ days)
3. **Test both AI engines**: Verify functionality with both OpenAI and Ollama
4. **Validate response structures**: AI responses must match expected data formats
5. **Test error scenarios**: Network failures, invalid data, permission issues
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Please clean up any files that you've created for testing or debugging purposes after they're no longer needed.