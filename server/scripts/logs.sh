#!/bin/bash
# Script to help with log management for Restaunax

# Function to show help
show_help() {
  echo "Restaunax Log Management Tool"
  echo "Usage: logs.sh [OPTION]"
  echo ""
  echo "Options:"
  echo "  -h, --help        Show this help message"
  echo "  -t, --tail        Tail the latest logs (last 100 lines)"
  echo "  -e, --errors      Show only error logs (last 100 lines)"
  echo "  -a, --audit       Show audit logs (login/logout events)"
  echo "  -f, --follow      Follow logs in real-time"
  echo "  -c, --clear       Clear all logs (keeps empty files)"
  echo "  -r, --rotate      Force log rotation"
  echo ""
  echo "Examples:"
  echo "  logs.sh -t        # Show the last 100 lines of all logs"
  echo "  logs.sh -e -f     # Follow error logs in real-time"
}

# Check if logs directory exists
if [ ! -d "../logs" ]; then
  mkdir -p ../logs
  echo "Created logs directory"
fi

# Get the logs directory absolute path
LOGS_DIR=$(cd ../logs && pwd)

# Process command line arguments
while [ "$1" != "" ]; do
  case $1 in
    -h | --help )
      show_help
      exit
      ;;
    -t | --tail )
      echo "=== Last 100 log lines ==="
      tail -n 100 ${LOGS_DIR}/combined.log
      ;;
    -e | --errors )
      echo "=== Last 100 error log lines ==="
      if [ -f "${LOGS_DIR}/error.log" ]; then
        tail -n 100 ${LOGS_DIR}/error.log
      else
        echo "No error logs found"
      fi
      ;;
    -a | --audit )
      echo "=== Audit logs (login/logout events) ==="
      if [ -f "${LOGS_DIR}/combined.log" ]; then
        grep -i "user_login\|user_logout\|token_refresh" ${LOGS_DIR}/combined.log | tail -n 50
      else
        echo "No audit logs found"
      fi
      ;;
    -f | --follow )
      echo "=== Following logs in real-time (Ctrl+C to exit) ==="
      tail -f ${LOGS_DIR}/combined.log
      ;;
    -c | --clear )
      echo "Clearing log files..."
      echo "" > ${LOGS_DIR}/combined.log
      echo "" > ${LOGS_DIR}/error.log
      echo "Logs cleared"
      ;;
    -r | --rotate )
      echo "Forcing log rotation..."
      if command -v docker &> /dev/null; then
        docker compose exec server logrotate -f /etc/logrotate.d/restaunax
        echo "Logs rotated"
      else
        echo "Docker not found. Please run this inside the container:"
        echo "logrotate -f /etc/logrotate.d/restaunax"
      fi
      ;;
    * )
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
  shift
done

# If no arguments, show help
if [ $# -eq 0 ]; then
  show_help
fi