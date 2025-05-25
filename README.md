# Restaunax

Restaunax is a real-time order management dashboard for restaurants. The system enables wait staff to create and update customer orders and allows managers/owners to monitor order status in real-time, improving restaurant operational efficiency.

## Technology Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: React, Material UI
- **Deployment**: Docker, Docker Compose

## Features

### Core Order Management
- Create and manage restaurant orders with automatic order numbering
- Track order status (pending, preparing, ready, delivered)
- Real-time order dashboard
- Responsive design for desktop, tablet, and mobile

### Menu Management
- Predefined menu items with categorization
- Auto-fill pricing when menu items are selected
- Mixed ordering (select from menu or enter custom items)
- Alphabetical sorting of menu items for easier discovery

### Authentication & Security
- Role-based access control (wait staff, manager, owner)
- JWT token authentication with access and refresh tokens
- Secure password storage with bcrypt
- Audit logging for tracking user actions

### Dynamic Theming
- Custom themes for each restaurant
- Theme applied automatically based on user's restaurant
- Material UI theme customization
- Theme data stored with restaurants

### AI & Analytics
- **Demand Forecasting**: AI-powered demand prediction using historical order data
- **Menu Optimization**: Comprehensive menu analysis with performance insights and recommendations
- **Engine-Agnostic AI**: Support for OpenAI and Ollama with flexible AI engine configuration
- **Actionable Insights**: Revenue analysis, trend identification, and strategic recommendations

### User Experience
- Intuitive order creation interface with autocomplete
- Form validation for required fields
- Restaurant-specific sequential order numbers (format: R1-20250520-001)
- Visual status indicators for different order stages

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)

### Running the Application

1. Clone the repository
2. Set up environment configuration:

```bash
# Copy the consolidated environment template
cp .env.example .env

# Edit the .env file with your configuration
# For Docker setup, the defaults should work out of the box
```

3. Start the application with Docker Compose:

```bash
# Standard startup
docker compose up

# Optimized build with Docker Bake (recommended)
COMPOSE_BAKE=true docker compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8081

### Docker Optimization

This project includes optimized Docker configuration with:
- **Multi-stage builds** for smaller images and better caching
- **Docker Bake** support for parallel builds (60% faster)
- **Security hardening** with non-root users and resource limits
- **Health checks** for reliable service monitoring

For detailed information, see:
- [`docs/docker/DOCKER_GUIDE.md`](docs/docker/DOCKER_GUIDE.md) - Comprehensive optimization guide
- [`docs/docker/DOCKER_OPTIMIZATION_SUMMARY.md`](docs/docker/DOCKER_OPTIMIZATION_SUMMARY.md) - Quick reference
- [`docs/docker/REACT_DOCKER_TROUBLESHOOTING.md`](docs/docker/REACT_DOCKER_TROUBLESHOOTING.md) - Frontend-specific issues

### Environment Configuration

The application uses a **single consolidated `.env` file** for all configuration:

- **`.env`**: All environment variables (database, API, security, development settings)

**Benefits:**
- ✅ Single source of truth for all configuration
- ✅ No duplication across multiple files  
- ✅ Consistent values across all services
- ✅ Simplified setup and maintenance

For detailed information, see [`docs/ENVIRONMENT_MANAGEMENT.md`](docs/ENVIRONMENT_MANAGEMENT.md).

**Important Security Notes:**
- Change JWT secrets in `.env` for production
- Use strong database passwords in `.env` for production  
- The default values are safe for development

**AI Features:**
Set `OLLAMA_ENABLED=true` in `.env` to enable AI-powered insights and menu optimization features.

### Development Setup

#### Backend

```bash
cd server
npm install
npm run dev
```

#### Frontend

```bash
cd client
npm install
npm start
```

### Database Setup

The database is automatically set up when running with Docker Compose. For local development, you can run:

```bash
cd server
npm run migrate:dev
npm run seed
```

### Test Users

The application comes with pre-seeded test users for different roles:

- **Username**: `test`, **Password**: `Test1234`, **Role**: `wait_staff` (Restaurant 1)
- **Username**: `manager`, **Password**: `Test1234`, **Role**: `manager` (Restaurant 1)
- **Username**: `owner`, **Password**: `Test1234`, **Role**: `owner` (Restaurant 1)
- **Username**: `test2`, **Password**: `Test1234`, **Role**: `wait_staff` (Restaurant 2)
- **Username**: `manager2`, **Password**: `Test1234`, **Role**: `manager` (Restaurant 2)
- **Username**: `owner2`, **Password**: `Test1234`, **Role**: `owner` (Restaurant 2)

## API Endpoints

### Authentication API
- `POST /api/auth/login` - Login with username and password
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate refresh token

### Order API
- `GET /api/orders` - Get all orders with optional status filter
- `GET /api/orders/:id` - Get a single order by ID
- `POST /api/orders` - Create a new order
- `PATCH /api/orders/:id` - Update order status

### Menu API
- `GET /api/menu-items` - Get all menu items with optional category filter
- `GET /api/menu-items/:id` - Get a single menu item by ID

### Restaurant API
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/theme` - Get restaurant theme settings

## Data Models

### User
- **id**: Unique identifier (UUID)
- **username**: Username for authentication (unique)
- **password**: Hashed password
- **role**: User role (wait_staff, manager, owner)
- **restaurantId**: Reference to the user's restaurant
- **createdAt/updatedAt**: Timestamps

### Restaurant
- **id**: Unique identifier (UUID)
- **name**: Name of the restaurant
- **themeId**: Theme identifier
- **primaryColor**: Primary color for branding
- **secondaryColor**: Secondary color for branding
- **createdAt/updatedAt**: Timestamps

### Order
- **id**: Unique identifier (UUID)
- **orderNumber**: Restaurant-specific sequential order number (e.g., R1-20250520-001)
- **customerName**: Name of the customer
- **orderType**: Type of order (delivery or pickup)
- **status**: Current status (pending, preparing, ready, delivered)
- **total**: Total order amount
- **items**: List of order items
- **restaurantId**: Reference to the restaurant
- **userId**: Reference to the user who created the order
- **createdAt/updatedAt**: Timestamps

### Order Item
- **id**: Unique identifier (UUID)
- **orderId**: Reference to the parent order
- **name**: Name of the item
- **quantity**: Number of items ordered
- **price**: Price per item
- **menuItemId**: Optional reference to a predefined menu item
- **createdAt/updatedAt**: Timestamps

### Menu Item
- **id**: Unique identifier (UUID)
- **name**: Name of the menu item
- **price**: Price of the menu item
- **description**: Optional description
- **category**: Optional category for grouping
- **restaurantId**: Reference to the restaurant
- **createdAt/updatedAt**: Timestamps

## Implemented Features

### MVP1: Core Order Management
- ✅ Complete order creation and management workflow
- ✅ Status tracking and updates
- ✅ Real-time order dashboard
- ✅ Responsive design for multiple devices

### MVP1 Enhancements
- ✅ Menu items with categories
- ✅ Autocomplete for order creation
- ✅ Restaurant-specific order numbering (resets daily)
- ✅ Alphabetical sorting of menu items

### MVP2: Authentication System
- ✅ User authentication with JWT tokens
- ✅ Role-based access control
- ✅ Secure password storage with bcrypt
- ✅ Refresh token mechanism with HTTP-only cookies
- ✅ Audit logging for user actions

### MVP3: Dynamic Theming
- ✅ Restaurant-specific themes
- ✅ Theme applied based on user's restaurant
- ✅ Material UI theme customization
- ✅ Theme data stored in database
- ✅ Theme component in the header

### MVP4: Reports & Analytics
- ✅ Order reports with filtering and date ranges
- ✅ Downloadable CSV/PDF reports
- ✅ Revenue and performance analytics

### MVP5: AI-Powered Features
- ✅ **Demand Forecasting**: AI-powered demand prediction with configurable parameters
- ✅ **Menu Optimization**: Comprehensive menu performance analysis and optimization recommendations
- ✅ **AI Engine Abstraction**: Support for OpenAI and Ollama engines with transparent switching
- ✅ **Historical Analysis**: Deep analysis using 90+ days of business data
- ✅ **Real-time Insights**: Item performance, category analysis, and actionable recommendations

## Testing

Restaunax includes comprehensive test coverage for both backend and frontend components.

### Backend Testing

Backend tests cover services, controllers, and API endpoints with a focus on:

- Menu service tests verify alphabetical sorting and filtering capabilities
- Order service tests include validation of restaurant-specific order number generation
- Order status transition validation
- API endpoint validation including error handling
- Authentication and authorization tests
- Theme system tests
- AI service tests including menu optimization and demand forecasting
- AI engine abstraction layer tests

```bash
cd server
npm test
```

Server-side tests achieve over 90% code coverage for critical services.

### Frontend Testing

Frontend tests use React Testing Library to verify component behavior:

- OrderCard tests verify proper order number display and fallback mechanisms
- OrderForm tests validate the Autocomplete component integration with menu items
- Form validation and submission tests ensure data integrity
- Component rendering tests verify UI elements
- Authentication context and protected routes tests
- Theme context tests
- AI feature component tests including MenuOptimizationForm and ForecastViewer
- AI context and integration tests

```bash
cd client
npm test
```

## Security

The application implements several security measures:

- XSS prevention using sanitize-html
- SQL injection prevention using Prisma ORM
- CORS configuration to allow requests only from the frontend
- Data validation using Joi
- JWT token authentication with refresh tokens
- Secure password storage with bcrypt
- HTTP-only cookies for refresh tokens
- Role-based access control
- Rate limiting for login attempts

## Troubleshooting

### Common Issues

#### Frontend Not Accessible (Connection Reset)
If you can't access http://localhost:3000:
1. Check if React dev server has sufficient memory (2GB required)
2. Ensure HOST=0.0.0.0 is set in environment variables
3. Verify container logs: `docker compose logs client --follow`

See [`docs/docker/REACT_DOCKER_TROUBLESHOOTING.md`](docs/docker/REACT_DOCKER_TROUBLESHOOTING.md) for detailed solutions.

#### Slow Build Times
Use Docker Bake for faster builds:
```bash
COMPOSE_BAKE=true docker compose build
```

#### Database Connection Issues
```bash
# Restart database service
docker compose restart db

# Check database logs
docker compose logs db
```

#### Health Check Failures
```bash
# Check service status
docker compose ps

# View service logs
docker compose logs [service-name]
```

For comprehensive troubleshooting, see [`docs/docker/DOCKER_GUIDE.md`](docs/docker/DOCKER_GUIDE.md).

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[Docker & Deployment](docs/docker/)** - Container optimization and troubleshooting
- **[MVP Implementation](docs/mvp/)** - Feature development guides  
- **[Technical Guides](docs/)** - Authentication, logging, error handling
- **[Full Documentation Index](docs/README.md)** - Complete documentation overview

## Future Enhancements

- MVP 4: Order reports and analytics

## Technical Details

### Order Number Generation
Order numbers use the format `REST-DATE-SEQUENCE` (e.g., R1-20250520-001):
- REST: Restaurant identifier (e.g., "R1" for restaurant 1)
- DATE: Current date in YYYYMMDD format
- SEQUENCE: Sequential number starting at 001 daily for each restaurant

The order number generation has been fully tested to ensure:
- Each restaurant maintains its own sequence
- Sequences reset daily
- The format is consistent and predictable
- Error handling for edge cases

### Authentication System
- JSON Web Tokens (JWT) with 15-minute expiry for access tokens
- Refresh tokens with 7-day expiry stored in HTTP-only cookies
- Role-based middleware for protecting routes
- Audit logging for tracking user actions
- Password strength validation
- Token revocation on logout

### Dynamic Theming System
- Theme data stored in the Restaurant model (themeId, primaryColor, secondaryColor)
- Static theme files for Material UI theming with different presets (default, rest_1, rest_2)
- ThemeContext for managing theme state and providing theme-related utilities
- Settings page for restaurant owners to customize their restaurant's theme
- Preview functionality before committing theme changes
- Theme applied automatically based on user's restaurant
- Theme indicator in the application header
- Audit logging of theme and settings changes
- Role-based access control (only owners can modify theme settings)

### Testing Strategy
- **Unit Tests**: Individual services and components are tested in isolation
- **Integration Tests**: API endpoints are tested with database interactions
- **Component Tests**: Frontend components are tested for rendering and behavior
- **Test Coverage**: Critical paths have >90% code coverage
- **CI/CD**: Tests run automatically on code changes