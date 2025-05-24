# MVP 4 Deployment Guide

This guide provides instructions for deploying the MVP 4 version of Restaunax, which includes the enhanced management dashboard and reporting features.

## Prerequisites

- Docker and Docker Compose installed
- Git repository access
- Node.js and npm (for local development only)

## New Dependencies

MVP 4 introduces several new dependencies:

### Frontend
- **recharts**: For data visualization charts on dashboard and reports
- **date-fns**: For date handling and formatting
- **@mui/x-date-pickers**: For date selection components

### Backend
- **pdfkit**: For PDF report generation
- **ws**: WebSocket library for real-time dashboard updates

## Deployment Steps

### 1. Clone/Pull the Repository

```bash
# If you're cloning for the first time
git clone [repository-url]
cd restaunax

# If you already have the repo
git pull origin dev
```

### 2. Build and Start Docker Containers

```bash
# Build and start the containers
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

The `--build` flag ensures that Docker rebuilds the images with the new dependencies.

### 3. Run Database Migrations

The MVP 4 implementation includes database migrations for the report-related tables. Run:

```bash
docker-compose exec server npx prisma migrate deploy
```

### 4. Seed the Database (Optional)

To populate the database with sample data for testing the dashboard and reports:

```bash
docker-compose exec server npm run seed
```

### 5. Verify Deployment

1. Navigate to `http://localhost:80` in your browser
2. Log in using credentials:
   - Manager account: `manager / password123`
   - Owner account: `owner / password123`
3. Check new features:
   - Dashboard tab should display real-time metrics
   - Reports tab should allow report generation and downloads

## Architecture Overview

### WebSocket Implementation

MVP 4 introduces WebSocket connections for real-time updates:

- **Server**: WebSocket server runs alongside the Express API
- **Client**: DashboardContext establishes WebSocket connection for authenticated users
- **Authentication**: WebSockets require valid JWT for connection
- **Events**: Three types of events are supported:
  - `new_order`: When new orders are created
  - `order_status_change`: When order status is updated
  - `revenue_update`: Periodic updates to revenue metrics

### Report Generation

The reporting system supports:

- **Web View**: Interactive reports with filters and charts
- **CSV Download**: For spreadsheet analysis
- **PDF Download**: For printable/shareable reports

### Role-Based Access

- Only `manager` and `owner` roles can access dashboard and reports
- `wait_staff` roles are restricted to order management

## Troubleshooting

### WebSocket Connection Issues

If the dashboard isn't receiving real-time updates:

1. Check browser console for WebSocket errors
2. Ensure the server WebSocket endpoint is accessible
3. Verify that JWT authentication is working properly

```bash
# Check WebSocket server logs
docker-compose logs -f server
```

### Report Download Problems

If report downloads aren't working:

1. Check browser console for API errors
2. Ensure that PDFKit is installed correctly
3. Verify the /reports/orders/download endpoint is responding

### Database Migration Issues

If database migration fails:

```bash
# Verify Prisma connection
docker-compose exec server npx prisma db pull

# Reset migration (use with caution, data will be lost)
docker-compose exec server npx prisma migrate reset --force
```

## Development Notes

For local development without Docker:

```bash
# Frontend
cd client
npm install
npm start

# Backend
cd server
npm install
npm run dev
```

Make sure to set up environment variables correctly for local development.