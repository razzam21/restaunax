#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Add .gitkeep file to ensure logs directory is tracked in git
touch logs/.gitkeep

# Ensure permissions are correct
chmod 755 logs
chmod 644 logs/.gitkeep

echo "✅ Log directory setup complete"