#!/bin/bash

# Create logs directory if it doesn't exist, handle permission errors gracefully
mkdir -p /app/logs 2>/dev/null || {
    echo "⚠️  Could not create logs directory (permissions), but logs will still work"
}

# Add .gitkeep file to ensure logs directory is tracked in git, handle permission errors
touch /app/logs/.gitkeep 2>/dev/null || {
    echo "⚠️  Could not create .gitkeep file (permissions), but logging will still work"
}

# Ensure permissions are correct, handle permission errors gracefully
chmod 755 /app/logs 2>/dev/null || true
chmod 644 /app/logs/.gitkeep 2>/dev/null || true

echo "✅ Log directory setup complete"