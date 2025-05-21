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
2. Start the application with Docker Compose:

```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8081

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

## API Endpoints

### Order API

- `GET /api/orders` - Get all orders with optional status filter
- `GET /api/orders/:id` - Get a single order by ID
- `POST /api/orders` - Create a new order
- `PATCH /api/orders/:id` - Update order status

### Menu API

- `GET /api/menu-items` - Get all menu items with optional category filter
- `GET /api/menu-items/:id` - Get a single menu item by ID

## Data Models

### Order
- **id**: Unique identifier (UUID)
- **orderNumber**: Restaurant-specific sequential order number (e.g., R1-20250520-001)
- **customerName**: Name of the customer
- **orderType**: Type of order (delivery or pickup)
- **status**: Current status (pending, preparing, ready, delivered)
- **total**: Total order amount
- **items**: List of order items
- **restaurantId**: Reference to the restaurant
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

## Testing

Restaunax includes comprehensive test coverage for both backend and frontend components.

### Backend Testing

Backend tests cover services, controllers, and API endpoints with a focus on:

- Menu service tests verify alphabetical sorting and filtering capabilities
- Order service tests include validation of restaurant-specific order number generation
- Order status transition validation
- API endpoint validation including error handling

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

## Future Enhancements (MVPs 2-4)

- MVP 2: Authentication and role-based authorization
- MVP 3: Dynamic theming
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

### Menu Item Integration
- Menu items are loaded alphabetically for quick discovery
- When a menu item is selected, its price is automatically filled
- Custom items can still be entered manually with custom pricing
- Autocomplete component supports both scenarios seamlessly

### Testing Strategy
- **Unit Tests**: Individual services and components are tested in isolation
- **Integration Tests**: API endpoints are tested with database interactions
- **Component Tests**: Frontend components are tested for rendering and behavior
- **Test Coverage**: Critical paths have >90% code coverage
- **CI/CD**: Tests run automatically on code changes