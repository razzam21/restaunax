# Error Handling and Logging in Restaunax

This document explains the error handling and logging system implemented in Restaunax.

## Error Handling Philosophy

1. **User-Facing Errors**: Users should never see technical error details, stack traces, or internal information. All errors shown to users are:
   - Clear and concise
   - Action-oriented when appropriate
   - Free of technical jargon
   - Consistent in tone and format

2. **Detailed Logging**: While users get simple messages, we log detailed information for troubleshooting:
   - Full error objects with stack traces
   - Contextual information (which component, function, etc.)
   - Request data (IP, user agent, request path)
   - User identifiers (when available)
   - Timing information

## Logging System

### Log Levels

- **ERROR**: System errors, database failures, authentication issues
- **WARN**: Concerning events that don't break functionality
- **INFO**: Normal operations, authentication events, audit trails
- **DEBUG**: Detailed information for development (not used in production)

### Log Storage

Logs are stored in the `logs` directory with automatic rotation:

- `error.log`: Critical errors (level: error)
- `combined.log`: All logs of all levels
- `exceptions.log`: Uncaught exceptions

Each log file:
- Is rotated when it reaches 10MB
- Keeps up to 5 historical files

### Structured Logging

All logs are in JSON format with consistent fields:

```json
{
  "timestamp": "2025-05-21T12:34:56.789Z",
  "level": "error",
  "message": "Database error during login",
  "service": "restaunax",
  "module": "user-service",
  "context": "loginUser",
  "error": {
    "name": "PrismaClientKnownRequestError",
    "message": "The table `public.User` does not exist in the current database.",
    "stack": "..."
  },
  "userId": "user123",
  "username": "johnsmith",
  "ip": "127.0.0.1",
  "path": "/api/auth/login",
  "method": "POST"
}
```

## Error Response Format

All API error responses follow this format:

```json
{
  "success": false,
  "error": "Clear error message for the user"
}
```

## Status Codes

- **400**: Bad Request - Invalid input
- **401**: Unauthorized - Missing or invalid authentication
- **403**: Forbidden - Valid authentication but insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **409**: Conflict - Resource already exists (e.g., username taken)
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Unexpected server issues
- **503**: Service Unavailable - Temporary server issues

## Security Considerations

1. **No Information Leakage**: Error messages never reveal:
   - Stack traces or line numbers
   - Database details or query information
   - Exact validation failures for credentials
   - Server information or environment details

2. **Generic Authentication Errors**: All authentication failures return the same message to prevent user enumeration

3. **Rate Limiting**: Authentication endpoints limit attempts to prevent brute force attacks

## Viewing Logs

To view the last 100 lines of error logs:

```bash
tail -n 100 logs/error.log
```

For production troubleshooting, use:

```bash
grep -i "login failed" logs/combined.log | jq '.'
```

## Development vs. Production

- **Development**: Console shows colorized, readable logs
- **Production**: Console shows only INFO and above, files contain detailed logs