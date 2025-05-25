#!/bin/bash

# Production build script for Restaunax
# Usage: ./build-production.sh [API_URL]
# Example: ./build-production.sh https://restaunax.turnersrus.com/api

set -e

# Default production API URL
DEFAULT_API_URL="https://restaunax.turnersrus.com/api"
API_URL="${1:-$DEFAULT_API_URL}"

echo "Building Restaunax for production..."
echo "API URL: $API_URL"

# Build server
echo "Building server..."
cd server
docker build -f ../docker/server/Dockerfile --target production -t restaunax-server:latest .
cd ..

# Build client with API URL
echo "Building client..."
cd client
cp ../docker/client/nginx.conf ./nginx.conf
docker build -f ../docker/client/Dockerfile --target production --build-arg REACT_APP_API_URL="$API_URL" -t restaunax-client:latest .
rm nginx.conf
cd ..

echo "Production build complete!"
echo "Images created:"
echo "- restaunax-server:latest"
echo "- restaunax-client:latest"
echo ""
echo "To test locally:"
echo "docker run -p 8081:8080 restaunax-server:latest"
echo "docker run -p 3000:3000 restaunax-client:latest"