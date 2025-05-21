#!/bin/bash
set -e

# ANSI color codes for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==== Restaunax MVP 1 Tests ====${NC}"

# Check if Docker is running
echo -e "\n${BLUE}Checking Docker status...${NC}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}Docker is running${NC}"

# Stop any existing containers
echo -e "\n${BLUE}Stopping any existing containers...${NC}"
docker-compose down

# Build and start the containers
echo -e "\n${BLUE}Building and starting containers...${NC}"
docker-compose up -d --build

# Wait for services to start up
echo -e "\n${BLUE}Waiting for services to start...${NC}"
sleep 10

# Test the database connection
echo -e "\n${BLUE}Testing database connection...${NC}"
if docker-compose exec db pg_isready -U postgres; then
  echo -e "${GREEN}Database connection successful${NC}"
else
  echo -e "${RED}Database connection failed${NC}"
  exit 1
fi

# Run Prisma migrations
echo -e "\n${BLUE}Running database migrations...${NC}"
docker-compose exec server npx prisma migrate dev --name init

# Run database seeding
echo -e "\n${BLUE}Seeding the database...${NC}"
docker-compose exec server node prisma/seed.js

# Test Backend API endpoints
echo -e "\n${BLUE}Testing Backend API endpoints...${NC}"

# Test GET /api/orders
echo -e "\n${BLUE}Testing GET /api/orders endpoint...${NC}"
if curl -s http://localhost:8081/api/orders | grep -q "customerName"; then
  echo -e "${GREEN}GET /api/orders test passed${NC}"
else
  echo -e "${RED}GET /api/orders test failed${NC}"
  exit 1
fi

# Test GET /api/orders?status=pending
echo -e "\n${BLUE}Testing GET /api/orders?status=pending endpoint...${NC}"
if curl -s "http://localhost:8081/api/orders?status=pending" | grep -q "pending"; then
  echo -e "${GREEN}GET /api/orders?status=pending test passed${NC}"
else
  echo -e "${RED}GET /api/orders?status=pending test failed${NC}"
  exit 1
fi

# Create a new order
echo -e "\n${BLUE}Testing POST /api/orders endpoint...${NC}"
ORDER_ID=$(curl -s -X POST http://localhost:8081/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test Customer",
    "orderType": "delivery",
    "total": 29.99,
    "restaurantId": "rest_1",
    "items": [
      {
        "name": "Test Pizza",
        "quantity": 1,
        "price": 19.99
      },
      {
        "name": "Test Salad",
        "quantity": 1,
        "price": 9.99
      }
    ]
  }' | grep -o '"id":"[^"]*"' | sed 's/"id":"//g' | sed 's/"//g')

if [ -n "$ORDER_ID" ]; then
  echo -e "${GREEN}POST /api/orders test passed. Created order with ID: $ORDER_ID${NC}"
else
  echo -e "${RED}POST /api/orders test failed${NC}"
  exit 1
fi

# Test GET /api/orders/:id
echo -e "\n${BLUE}Testing GET /api/orders/:id endpoint...${NC}"
if curl -s "http://localhost:8081/api/orders/$ORDER_ID" | grep -q "Test Customer"; then
  echo -e "${GREEN}GET /api/orders/:id test passed${NC}"
else
  echo -e "${RED}GET /api/orders/:id test failed${NC}"
  exit 1
fi

# Test PATCH /api/orders/:id
echo -e "\n${BLUE}Testing PATCH /api/orders/:id endpoint...${NC}"
if curl -s -X PATCH "http://localhost:8081/api/orders/$ORDER_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "preparing"}' | grep -q "preparing"; then
  echo -e "${GREEN}PATCH /api/orders/:id test passed${NC}"
else
  echo -e "${RED}PATCH /api/orders/:id test failed${NC}"
  exit 1
fi

# Check if frontend is accessible
echo -e "\n${BLUE}Checking if frontend is accessible...${NC}"
if curl -s http://localhost:3000 | grep -q "Restaunax"; then
  echo -e "${GREEN}Frontend is accessible${NC}"
else
  echo -e "${RED}Frontend is not accessible${NC}"
  exit 1
fi

echo -e "\n${GREEN}==== All tests passed! ====${NC}"
echo -e "${BLUE}Restaunax MVP 1 is working correctly.${NC}"
echo -e "\nFrontend: http://localhost:3000"
echo -e "Backend API: http://localhost:8081/api"

# Uncomment the following line to stop containers after tests
# docker-compose down