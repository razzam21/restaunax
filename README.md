# Restaunax - Restaurant Order Management System

A comprehensive, real-time order management platform designed specifically for restaurants. Restaunax streamlines operations by enabling staff to create and track customer orders while providing managers with powerful analytics and AI-driven insights.

## 📋 Table of Contents

- [What is Restaunax?](#what-is-restaunax)
- [Quick Start Installation](#quick-start-installation)
- [Pre-loaded Demo Data](#pre-loaded-demo-data)
- [Core Features](#core-features)
- [AI-Powered Analytics](#ai-powered-analytics)
- [Security & Data Protection](#security--data-protection)
- [System Architecture](#system-architecture)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

## What is Restaunax?

Restaunax is a complete restaurant management solution that helps restaurants:

- **Streamline Operations**: Take orders faster with automated menu suggestions and smart form completion
- **Track Performance**: Monitor order status in real-time across all staff members
- **Make Data-Driven Decisions**: Use AI analytics to optimize menu pricing, forecast demand, and identify trends
- **Secure Operations**: Role-based access ensures staff see only what they need, with full audit trails
- **Scale Efficiently**: Support multiple restaurants with custom branding and independent operations

Built with modern web technologies, Restaunax works seamlessly on desktop, tablet, and mobile devices, making it perfect for busy restaurant environments.

## Quick Start Installation

### System Requirements

- **Docker & Docker Compose** (recommended - includes everything you need)
- **OR Node.js 18+** and PostgreSQL 14+ (for manual setup)

### 1. Get Restaunax Running

```bash
# Clone the repository
git clone <repository-url>
cd restaunax

# Set up your environment (uses secure defaults)
cp .env.example .env

# Start everything with one command
docker compose up
```

**That's it!** Restaunax will be available at:
- **Application**: http://localhost:3000
- **API**: http://localhost:8081

### 2. First-Time Setup

When you start Restaunax for the first time, the system automatically:

✅ **Creates the database** with all required tables  
✅ **Loads demo restaurants** with sample menus  
✅ **Creates test user accounts** for immediate testing  
✅ **Generates sample orders** to demonstrate features  

**Important**: If you restart or redeploy, existing data is preserved - no data loss occurs.

### 3. Faster Builds (Optional)

For development work, use the optimized build system:

```bash
# 60% faster build times
COMPOSE_BAKE=true docker compose up --build
```

## Pre-loaded Demo Data

Restaunax comes with two fully-configured demo restaurants, complete with menus, orders, and user accounts:

### Demo Restaurants

| Restaurant | Theme | Menu Items | Sample Orders |
|------------|-------|------------|---------------|
| **Restaunax Demo Restaurant** | Blue & Orange | 7 items (Pizza, Pasta, Salads, Desserts) | 4 orders with various statuses |
| **Ocean Breeze Restaurant** | Deep Blue & Rustic Orange | Independent menu system | Separate order history |

### Test User Accounts

**Restaurant 1 - Restaunax Demo Restaurant**

| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| `test` | `Test1234` | Wait Staff | Create & view orders |
| `manager` | `Test1234` | Manager | All orders + basic reports |
| `owner` | `Test1234` | Owner | Full access + AI analytics |

**Restaurant 2 - Ocean Breeze Restaurant**

| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| `test2` | `Test1234` | Wait Staff | Create & view orders |
| `manager2` | `Test1234` | Manager | All orders + basic reports |
| `owner2` | `Test1234` | Owner | Full access + AI analytics |

**Quick Login**: Use `owner` / `Test1234` to see all features, including AI analytics.

## Core Features

### 🎯 Order Management
- **Smart Order Creation**: Autocomplete menu items with automatic pricing
- **Real-Time Tracking**: Live status updates (Pending → Preparing → Ready → Delivered)
- **Custom & Menu Items**: Mix predefined menu items with custom orders
- **Mobile-Friendly**: Works perfectly on tablets and phones for floor staff

### 📱 User Experience
- **Intelligent Order Numbers**: Restaurant-specific daily sequences (e.g., R1-20250524-001)
- **Instant Validation**: Form checks prevent errors before submission
- **Responsive Design**: Adapts to any screen size automatically
- **Visual Status Indicators**: Color-coded order states for quick recognition

### 👥 User Management
- **Role-Based Access**: Three permission levels with appropriate feature access
- **Secure Authentication**: JWT tokens with automatic refresh
- **Audit Trail**: Track who did what and when for accountability
- **Multi-Restaurant Support**: Completely separate operations per restaurant

### 🎨 Customization
- **Restaurant Branding**: Custom colors and themes per location
- **Menu Management**: Easy category organization and pricing updates
- **Settings Control**: Owners can customize their restaurant's appearance
- **Theme Preview**: See changes before applying them

### 📊 Reports & Analytics
- **Order Reports**: Filter by date, status, customer, or staff member
- **Revenue Analysis**: Track performance across time periods
- **Export Options**: Download reports as CSV or PDF
- **Performance Metrics**: Identify trends and busy periods

## AI-Powered Analytics

### What Are AI Features?

Restaunax includes advanced AI capabilities that analyze your restaurant data to provide actionable business insights. These features use artificial intelligence to process your historical orders, menu performance, and customer patterns.

### 🤖 Available AI Features

#### Demand Forecasting
- **Predict Future Orders**: Forecast customer demand based on historical patterns
- **Seasonal Insights**: Understand busy periods and plan staffing accordingly
- **Confidence Scoring**: Get reliable predictions with confidence indicators
- **Flexible Timeframes**: Forecast for days, weeks, or months ahead

#### Menu Optimization
- **Performance Analysis**: Identify your most and least profitable menu items
- **Revenue Insights**: See which items drive the most revenue per order
- **Category Comparison**: Compare performance across menu categories
- **Strategic Recommendations**: Get specific suggestions for menu improvements

### 🎛️ AI Configuration

AI features are **optional** and can be enabled in two ways:

#### Option 1: Local AI (Free, Private)
```bash
# In your .env file
AI_ENABLED=true
OLLAMA_ENABLED=true
AI_PRIMARY_ENGINE=ollama
```

**Requires**: Ollama installed locally
**Benefits**: Completely private, no data leaves your server, no ongoing costs

#### Option 2: Cloud AI (Powerful, Easy)
```bash
# In your .env file  
AI_ENABLED=true
OPENAI_ENABLED=true
OPENAI_API_KEY=your-api-key-here
AI_PRIMARY_ENGINE=openai
```

**Requires**: OpenAI API key
**Benefits**: More advanced AI, no local setup required

### 💰 AI Features Disabled (Default)

**When AI is turned off** (AI_ENABLED=false):

✅ **Full core functionality remains**: All order management, user accounts, reports, and restaurant features work perfectly  
✅ **AI sections show upgrade prompts**: Users see informational messages about available AI features  
✅ **No functionality loss**: The system is fully operational for restaurant management  
✅ **Easy to enable later**: Add AI capabilities anytime without data migration  

**This makes AI a value-added upsell** - restaurants get a complete order management system immediately, with the option to upgrade to AI analytics when they're ready.

## Security & Data Protection

Restaunax takes security seriously with multiple layers of protection:

### 🔐 Authentication & Authorization
- **Secure Password Storage**: Passwords are hashed using bcrypt with 12 salt rounds
- **JWT Token System**: Short-lived access tokens (15 minutes) with secure refresh tokens (7 days)
- **Role-Based Permissions**: Three levels of access with appropriate feature restrictions
- **Session Management**: Automatic logout and token refresh for security

### 🛡️ Data Protection
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Protection**: All user input sanitized with sanitize-html
- **CORS Configuration**: Restricted to authorized frontend origins only
- **Input Validation**: Server-side validation using Joi schemas
- **Rate Limiting**: Protection against brute force login attempts

### 📋 Audit & Compliance
- **Complete Audit Logs**: Track all user actions with timestamps and user IDs
- **Data Validation**: Multiple layers ensure data integrity
- **Secure Headers**: Helmet.js adds security headers automatically
- **Cookie Security**: HTTP-only, secure, same-site strict cookies

### 🏢 Multi-Tenant Security
- **Data Isolation**: Each restaurant's data is completely separate
- **User Restrictions**: Staff can only access their own restaurant's data
- **Theme Isolation**: Custom branding doesn't affect other restaurants
- **Order Number Separation**: Independent numbering per restaurant

## System Architecture

### Technology Stack

**Frontend (Client)**
- **React 18**: Modern user interface with hooks and context
- **Material-UI**: Professional, accessible design components
- **Axios**: Reliable API communication with error handling
- **React Router**: Smooth navigation and protected routes

**Backend (Server)**
- **Node.js + Express**: Fast, scalable server architecture
- **Prisma ORM**: Type-safe database operations with migrations
- **PostgreSQL**: Reliable, ACID-compliant database
- **Redis**: Session storage and caching for performance

**Deployment & DevOps**
- **Docker Compose**: One-command deployment with all services
- **Multi-stage Builds**: Optimized container images for production
- **Health Checks**: Automatic service monitoring and restart
- **Environment Management**: Single .env file configuration

### Database Design

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Restaurant  │    │    User      │    │   Order     │
│ ├─ id       │◄───┤ ├─ id        │    │ ├─ id       │
│ ├─ name     │    │ ├─ username  │    │ ├─ number   │
│ ├─ theme    │    │ ├─ role      │    │ ├─ customer │
│ └─ colors   │    │ └─ restaurant│◄───┤ ├─ status   │
└─────────────┘    └──────────────┘    │ └─ total    │
                                       └─────────────┘
                                              │
                                              ▼
                   ┌─────────────┐    ┌──────────────┐
                   │ Menu Item   │    │ Order Item   │
                   │ ├─ id       │◄───┤ ├─ id        │
                   │ ├─ name     │    │ ├─ name      │
                   │ ├─ price    │    │ ├─ quantity  │
                   │ ├─ category │    │ └─ price     │
                   │ └─ restaurant    └──────────────┘
                   └─────────────┘
```

**Key Design Principles:**
- **Data Integrity**: Foreign key constraints ensure referential integrity
- **Soft Deletes**: Important data is never permanently lost
- **Audit Fields**: Created/updated timestamps on all records
- **UUID Primary Keys**: Globally unique identifiers for security

## Testing & Quality Assurance

Restaunax maintains high code quality through comprehensive testing:

### Test Coverage

**Backend Testing** (Node.js/Jest)
- ✅ **82+ Unit Tests**: Individual service and controller testing
- ✅ **Integration Tests**: Full API endpoint validation with database
- ✅ **Security Tests**: Authentication, authorization, and input validation
- ✅ **AI Service Tests**: Menu optimization and demand forecasting
- ✅ **Database Tests**: Data integrity and constraint validation

**Frontend Testing** (React Testing Library)
- ✅ **45+ Component Tests**: User interface and interaction testing
- ✅ **Context Tests**: State management and data flow validation
- ✅ **Form Tests**: Input validation and submission workflows
- ✅ **Authentication Tests**: Login, logout, and protected route access
- ✅ **Accessibility Tests**: Screen reader and keyboard navigation support

### Quality Metrics

- **Code Coverage**: >90% for critical business logic
- **Test Success Rate**: 100% (127+ total tests passing)
- **Performance**: <2 second average response times
- **Security**: Zero known vulnerabilities in dependencies

### Running Tests

```bash
# Backend tests
docker compose exec server npm test

# Frontend tests  
docker compose exec client npm test

# Run tests with coverage reports
docker compose exec server npm run test:coverage
docker compose exec client npm run test:coverage
```

## Documentation

Complete documentation is available in the `docs/` directory:

### 📚 Available Guides

| Document | Description |
|----------|-------------|
| **[Setup & Installation](docs/README.md)** | Comprehensive setup instructions |
| **[Docker Guide](docs/docker/DOCKER_GUIDE.md)** | Container optimization and troubleshooting |
| **[Authentication Setup](docs/SETUP_AUTH.md)** | Security configuration guide |
| **[AI Features](docs/AI_ABSTRACTION_IMPLEMENTATION.md)** | AI integration and development |
| **[Environment Management](docs/ENVIRONMENT_MANAGEMENT.md)** | Configuration best practices |
| **[MVP Implementation](docs/mvp/)** | Feature development roadmap |

### 🔧 Development Guides

- **[Contributing](CONTRIBUTING.md)**: How to contribute to Restaunax
- **[Development Setup](CLAUDE.md)**: Local development environment
- **[Error Handling](docs/ERROR_HANDLING.md)**: Error management patterns
- **[Logging](docs/LOG_MANAGEMENT.md)**: Application logging strategy

## Troubleshooting

### Common Issues & Solutions

#### 🌐 Can't Access the Application

**Problem**: Browser shows "connection refused" at http://localhost:3000

**Solutions**:
1. **Check containers are running**: `docker compose ps`
2. **View container logs**: `docker compose logs client`
3. **Restart services**: `docker compose restart`
4. **Rebuild with fresh start**: `docker compose down && docker compose up --build`

#### 🗄️ Database Connection Errors

**Problem**: "Database connection failed" errors

**Solutions**:
1. **Check database status**: `docker compose logs db`
2. **Restart database**: `docker compose restart db`
3. **Reset database**: `docker compose down -v && docker compose up` (⚠️ loses data)

#### 🏗️ Slow Build Times

**Problem**: Docker builds take too long

**Solutions**:
1. **Use optimized builds**: `COMPOSE_BAKE=true docker compose build`
2. **Clean Docker cache**: `docker system prune`
3. **Check available memory**: Ensure Docker has 4GB+ RAM allocated

#### 🤖 AI Features Not Working

**Problem**: AI analytics show errors or aren't available

**Solutions**:
1. **Check AI configuration in .env**:
   ```bash
   AI_ENABLED=true
   OLLAMA_ENABLED=true  # or OPENAI_ENABLED=true
   ```
2. **For Ollama**: Ensure Ollama is running locally
3. **For OpenAI**: Verify API key is correct and has credits
4. **Check logs**: `docker compose logs server | grep -i ai`

### Getting Help

- **Documentation**: Check the `docs/` directory for detailed guides
- **Logs**: Use `docker compose logs [service-name]` to diagnose issues
- **GitHub Issues**: Report bugs or request features
- **Discord Community**: Join our developer community for support

---

## Summary

Restaunax provides a complete restaurant management solution that grows with your business:

🎯 **Start Immediately**: Pre-loaded demo data means you can test all features right away  
🔧 **Easy Setup**: One command deployment with Docker  
🛡️ **Enterprise Security**: Bank-level security with role-based access  
🤖 **AI-Ready**: Optional AI analytics for data-driven decisions  
📱 **Mobile-First**: Works perfectly on any device  
📊 **Comprehensive Reports**: Track performance with detailed analytics  
🎨 **Fully Customizable**: Brand each restaurant with custom themes  

Whether you're running one restaurant or managing a chain, Restaunax provides the tools you need to streamline operations and make better business decisions.