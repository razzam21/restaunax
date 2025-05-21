#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p /app/logs

# Add .gitkeep file to ensure logs directory is tracked in git
touch /app/logs/.gitkeep

# Ensure permissions are correct
chmod 755 /app/logs
chmod 644 /app/logs/.gitkeep

echo "Log directory setup complete"