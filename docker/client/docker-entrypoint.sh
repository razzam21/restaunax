#!/bin/sh

echo "=== ENTRYPOINT SCRIPT EXECUTING ==="
echo "REACT_APP_API_URL: ${REACT_APP_API_URL:-UNSET}"

# Create config files with environment variable substitution
echo "window.CONFIG = { API_URL: \"${REACT_APP_API_URL:-http://localhost:8081/api}\" };" > /usr/share/nginx/html/config.js
echo "window.CONFIG = { API_URL: \"${REACT_APP_API_URL:-http://localhost:8081/api}\" };" > /usr/share/nginx/html/config-override.js

echo "Config file created:"
cat /usr/share/nginx/html/config-override.js

echo "=== STARTING NGINX ==="
exec nginx -g "daemon off;"