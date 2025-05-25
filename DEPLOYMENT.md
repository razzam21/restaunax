# Restaunax Deployment Guide for Unraid

This guide explains how to deploy Restaunax to your Unraid server using GitLab CI/CD.

## Prerequisites

### Unraid Server Setup

1. **Docker Registry**: Ensure your Unraid server has a Docker registry running on port 5000
2. **Ollama Server**: Install and configure Ollama on your Unraid server
3. **SSH Access**: Ensure SSH access is enabled on your Unraid server

### GitLab Variables

Set the following variables in your GitLab project settings (Settings > CI/CD > Variables):

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `UNRAID_SERVER` | Your Unraid server IP address | `10.13.0.254` |
| `UNRAID_USER` | SSH username for Unraid | `root` |
| `UNRAID_PRIVATE_KEY` | SSH private key for Unraid access | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

## Ollama Setup on Unraid

### 1. Install Ollama

```bash
# SSH into your Unraid server
ssh root@10.13.0.254

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve &
```

### 2. Install Required Model

```bash
# Pull the DeepSeek Coder model
ollama pull deepseek-coder:1.3b

# Verify model is available
ollama list
```

### 3. Configure Ollama for Network Access

Create or edit `/etc/systemd/system/ollama.service`:

```ini
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0:11434"

[Install]
WantedBy=default.target
```

Restart the service:
```bash
systemctl daemon-reload
systemctl enable ollama
systemctl start ollama
```

## Deployment Process

### Automatic Deployment

1. **Push to dev branch**: Any push to the `dev` branch triggers automatic deployment
2. **Pipeline stages**:
   - **Build**: Creates production Docker images and pushes them to your Unraid registry
   - **Deploy**: Automatically deploys to your Unraid server

### Manual Deployment

If you need to deploy manually:

```bash
# On your Unraid server
cd /mnt/user/appdata/restaunax
docker compose -f docker-compose.production.yml up -d
```

## Configuration Details

### Network Configuration

- **Frontend Port**: 3001 (accessible at http://your-unraid-ip:3001)
- **Backend API**: 8081 (internal)
- **Database**: 5432 (internal)
- **Redis**: 6379 (internal)

### AI Configuration

- **AI Enabled**: True
- **Ollama URL**: http://10.13.0.254:11434
- **Model**: deepseek-coder:1.3b
- **Timeout**: 60 seconds

### Security

- **CORS Origin**: https://restaunax.turnersrus.com
- **JWT Secrets**: Long, secure randomly generated secrets
- **Database**: Secure passwords generated during deployment

## Monitoring

### Health Checks

The pipeline includes automatic health checks:

- **Frontend**: Verifies web interface is responding
- **Backend API**: Checks `/api/health` endpoint
- **Services**: Monitors Docker container status

### Logs

View application logs:

```bash
# All services
docker compose -f docker-compose.production.yml logs

# Specific service
docker compose -f docker-compose.production.yml logs restaunax-server

# Follow logs in real-time
docker compose -f docker-compose.production.yml logs -f
```

### Service Status

Check service status:

```bash
docker compose -f docker-compose.production.yml ps
```

## Troubleshooting

### Common Issues

#### Pipeline Fails at Build Stage

1. **Check Docker registry**: Ensure registry is running on port 5000
2. **SSH access**: Verify SSH key is correct in GitLab variables
3. **Build resources**: Ensure sufficient disk space and memory

#### Pipeline Fails at Deploy Stage

1. **SSH connection**: Test SSH access manually
2. **Unraid disk space**: Ensure sufficient space in `/mnt/user/appdata/`
3. **Port conflicts**: Check if ports 3001, 8081 are available

#### Application Not Accessible

1. **Check container status**: `docker compose -f docker-compose.production.yml ps`
2. **View logs**: `docker compose -f docker-compose.production.yml logs`
3. **Test health endpoints**:
   ```bash
   curl http://localhost:3001  # Frontend
   curl http://localhost:8081/api/health  # Backend
   ```

#### AI Features Not Working

1. **Verify Ollama**: `curl http://10.13.0.254:11434/api/tags`
2. **Check model**: Ensure `deepseek-coder:1.3b` is installed
3. **Network connectivity**: Test connection from container to Ollama

### Manual Recovery

If automatic deployment fails:

```bash
# Stop services
docker compose -f docker-compose.production.yml down

# Pull latest images
docker pull your-unraid-ip:5000/restaunax-client:latest
docker pull your-unraid-ip:5000/restaunax-server:latest

# Start services
docker compose -f docker-compose.production.yml up -d
```

### Rollback

Use the manual rollback job in GitLab:

1. Go to CI/CD > Pipelines
2. Find the deployment pipeline
3. Click the manual "rollback_deployment" job
4. This will stop all services (manual restart required)

## Data Persistence

### Volumes

- **Database**: `/mnt/user/appdata/restaunax/postgres_data`
- **Redis**: `/mnt/user/appdata/restaunax/redis_data`
- **Logs**: `/mnt/user/appdata/restaunax/server_logs`
- **Uploads**: `/mnt/user/appdata/restaunax/server_uploads`

### Backup

Regular backups are recommended:

```bash
# Backup database
docker exec restaunax-db pg_dump -U postgres restaunax > backup.sql

# Backup application data
tar -czf restaunax-backup.tar.gz /mnt/user/appdata/restaunax/
```

## Access URLs

After successful deployment:

- **Application**: http://your-unraid-ip:3001
- **API Health**: http://your-unraid-ip:8081/api/health
- **Domain (if configured)**: https://restaunax.turnersrus.com

## Security Notes

- Change default passwords in production
- Use HTTPS with proper SSL certificates
- Restrict SSH access to necessary users only
- Regularly update Docker images
- Monitor application logs for security events

## Support

For deployment issues:

1. Check GitLab pipeline logs
2. Review Unraid system logs
3. Examine application container logs
4. Test individual components (database, redis, ollama)
5. Verify network connectivity between services