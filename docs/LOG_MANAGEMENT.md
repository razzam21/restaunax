# Log Management in Restaunax

This document explains how logging works in Restaunax and how to manage logs effectively.

## Log Structure

Logs are stored in the `logs` directory with these main files:

- `combined.log` - All logs from all levels (info, warn, error)
- `error.log` - Only error level logs
- `exceptions.log` - Uncaught exceptions and unhandled rejections

## Log Format

Logs are stored in JSON format for easy parsing. A typical log entry looks like:

```json
{
  "timestamp": "2025-05-21T15:30:45.123Z",
  "level": "error",
  "message": "Database connection failed",
  "service": "restaunax",
  "module": "db-client",
  "context": "connect",
  "error": {
    "name": "ConnectionError",
    "message": "Could not connect to database",
    "stack": "..."
  },
  "additionalInfo": {
    "host": "db.example.com",
    "port": 5432
  }
}
```

## Automatic Log Rotation

Logs are automatically rotated based on these rules:

- Rotation occurs daily
- Log files are rotated when they reach 10MB
- We keep 7 rotated log files before deleting the oldest
- Rotated logs are compressed to save space

## Git Setup

The `/server/logs` directory is included in the repository (via a `.gitkeep` file), but log files themselves are ignored in `.gitignore`.

To ensure the logs directory exists:

```bash
# From the project root
npm run setup

# Or from the server directory
npm run setup
```

## Managing Logs

### Using the Log Management Script

We provide a script to help manage logs: `server/scripts/logs.sh`

```bash
cd server/scripts
./logs.sh --help
```

Common commands:

```bash
# View the last 100 log lines
./logs.sh --tail

# View only error logs
./logs.sh --errors

# View audit logs (login/logout events)
./logs.sh --audit

# Follow logs in real-time (like tail -f)
./logs.sh --follow

# Clear all logs
./logs.sh --clear

# Force log rotation
./logs.sh --rotate
```

### Manually Managing Logs

If you prefer to manage logs manually:

```bash
# View the last 100 lines of all logs
tail -n 100 logs/combined.log

# View the last 50 lines of error logs
tail -n 50 logs/error.log

# Follow logs in real-time
tail -f logs/combined.log

# Search for specific errors
grep "Database error" logs/error.log

# Find all failed login attempts
grep "User login failed" logs/combined.log
```

## Logs in Docker

When running in Docker:

- Logs are stored in a dedicated volume (`server_logs`)
- This ensures logs persist even if containers are restarted
- Log rotation is handled by logrotate inside the container

To access logs in Docker:

```bash
# View logs in the running container
docker compose exec server cat /app/logs/combined.log | tail -n 100

# Copy logs from the container to your machine
docker compose cp server:/app/logs ./local-logs

# Follow logs in real-time
docker compose exec server tail -f /app/logs/combined.log
```

## Log Levels

We use these log levels:

- **ERROR**: System errors, crashes, failures
- **WARN**: Concerning events that don't cause failures
- **INFO**: Normal operations, requests, authentications
- **DEBUG**: Detailed debugging information (development only)

The log level is controlled by the `LOG_LEVEL` environment variable (default: info).

## Production Considerations

For production environments:

1. Regularly archive older logs to prevent disk space issues
2. Set up log monitoring for critical errors
3. Consider sending logs to a centralized logging system
4. Review error logs daily for security issues
5. Set up alerts for suspicious authentication failures

## Security Note

Logs may contain sensitive information. Always:

- Secure access to log files
- Redact sensitive data before sharing logs
- Be cautious when storing logs long-term