# Restaunax

Restaunax is a real-time order management dashboard for restaurants. The system enables wait staff to create and update customer orders and allows managers/owners to monitor order status in real-time, improving restaurant operational efficiency.

## Technology Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: React, Material UI
- **Deployment**: Docker, Docker Compose

## Features (MVP 1)

- Create and manage restaurant orders
- Track order status (pending, preparing, ready, delivered)
- Real-time order dashboard
- Responsive design for desktop, tablet, and mobile

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

## Testing

### Backend Testing

```bash
cd server
npm test
```

### Frontend Testing

```bash
cd client
npm test
```

## Security

The application implements several security measures:

- XSS prevention using sanitize-html
- SQL injection prevention using Prisma ORM
- CORS configuration to allow requests only from the frontend

## Future Enhancements (MVPs 2-4)

- MVP 2: Authentication and role-based authorization
- MVP 3: Dynamic theming
- MVP 4: Order reports and analytics