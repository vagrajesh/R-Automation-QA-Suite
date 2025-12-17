# Production Deployment Guide

## Quick Start

### 1. Environment Setup
```bash
# Copy template
cp .env.example .env

# Generate secure session secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Edit .env with your values
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=<generated-secret>
NODE_ENV=production
```

### 2. Install & Build
```bash
# Install dependencies
npm ci

# Build both frontend and backend
npm run build:server
npm run build

# Verify builds
ls -la dist/server.js      # Backend built
ls -la dist/index.html     # Frontend built
```

### 3. Run in Production

#### Option A: Node.js Direct
```bash
NODE_ENV=production node dist/server.js
```

#### Option B: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start dist/server.js --name "r-automation"
pm2 save
pm2 startup
```

#### Option C: Docker
```bash
docker build -t r-automation .
docker run -p 8080:8080 --env-file .env r-automation
```

## Critical Configuration

### Environment Variables
```
# REQUIRED - Application will crash without these
CORS_ORIGIN=https://yourdomain.com    # Your frontend URL
SESSION_SECRET=<long-random-string>    # Generate with crypto.randomBytes(32)

# OPTIONAL - Has sensible defaults
NODE_ENV=production                    # controls logging
PORT=8080                              # backend port
```

### Security Checklist Before Deploying
- [ ] .env is NOT committed to git
- [ ] SESSION_SECRET is a strong random string
- [ ] CORS_ORIGIN matches your actual domain
- [ ] Using HTTPS in production
- [ ] .env file has restrictive permissions (600)
- [ ] Node.js is up to date (v18+ recommended)

## Session Storage - Important!

**Current:** In-memory sessions (lost on restart)
**For Production:** Use persistent storage

### Add Redis (Recommended)
```bash
npm install connect-redis redis
```

Update `src/server.ts`:
```typescript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
redisClient.connect();

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    // ... rest of config
  })
);
```

## Monitoring & Logging

### Standard Output
Backend logs to console - configure your container/systemd to capture:
- Application startup status
- Error messages with timestamps
- Graceful shutdown signals

### Health Check Endpoint
```bash
curl http://localhost:8080/api/health
# Response: {"status":"ok","message":"Backend is running"}
```

### Log in Foreground (for debugging)
```bash
NODE_ENV=production node dist/server.js
```

## Common Issues

### Port 8080 Already in Use
```bash
# Find process using port
lsof -i :8080

# Kill it or use different port
PORT=9000 node dist/server.js
```

### Session Secret Not Set
```
❌ Missing required environment variables: SESSION_SECRET
```
Solution: Add `SESSION_SECRET=<your-secret>` to .env

### CORS Errors
```
Error: Access-Control-Allow-Origin header missing
```
Solution: Verify CORS_ORIGIN in .env matches your frontend URL

## Reverse Proxy Setup (Nginx)

```nginx
upstream r_automation {
  server 127.0.0.1:8080;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://r_automation;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Performance Tuning

### Node.js Memory
```bash
# Set memory limit
NODE_OPTIONS="--max_old_space_size=512" node dist/server.js
```

### Connection Limits
```bash
# Increase file descriptors
ulimit -n 65535
```

### CPU Optimization
```bash
# Use cluster mode with PM2
pm2 start dist/server.js -i max --name "r-automation"
```

## Backup & Recovery

### Database Backup
If using persistent session storage, implement regular backups:
```bash
# Redis example
redis-cli --rdb /backups/redis-$(date +%Y%m%d).rdb
```

### Configuration Backup
```bash
# Keep .env.production.backup
cp .env .env.production.backup
```

## Upgrade Procedure

1. **Backup current state**
   ```bash
   git tag production-backup-$(date +%Y%m%d)
   cp .env .env.backup
   ```

2. **Build new version**
   ```bash
   npm ci
   npm run build:server
   npm run build
   ```

3. **Stop old process**
   ```bash
   pm2 stop r-automation
   ```

4. **Verify new build**
   ```bash
   npm run build:server && node dist/server.js --dry-run
   ```

5. **Start new version**
   ```bash
   pm2 restart r-automation
   pm2 save
   ```

6. **Verify health**
   ```bash
   curl https://yourdomain.com/api/health
   ```

## Troubleshooting

### Application won't start
1. Check logs: `pm2 logs r-automation`
2. Verify .env file: `cat .env`
3. Test manually: `node dist/server.js`

### High memory usage
- Check for session memory leak
- Implement persistent session store
- Monitor with: `pm2 monit`

### Slow API responses
- Check backend logs for errors
- Verify network connectivity to Jira/ServiceNow
- Check resource usage: `top`, `iostat`

### Sessions lost on restart
- This is expected with in-memory storage
- Implement Redis/PostgreSQL for persistence
- See "Session Storage" section above

## Support

For issues:
1. Check logs: `pm2 logs r-automation`
2. Verify environment: `env | grep -E "CORS|SESSION|NODE_ENV"`
3. Test health: `curl http://localhost:8080/api/health`
4. See PRODUCTION_CHECKLIST.md for detailed information

---

**Last Updated:** December 12, 2025
