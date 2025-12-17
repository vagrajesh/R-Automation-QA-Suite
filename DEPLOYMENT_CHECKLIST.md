# Production Deployment Checklist
**Last Updated:** December 15, 2025

Use this checklist before deploying to production.

---

## Pre-Deployment (48 hours before)

### Code Verification
- [ ] All code committed to git
- [ ] No uncommitted changes
- [ ] All tests passing
- [ ] No console.log statements in production code
- [ ] No TODO/FIXME comments in critical code
- [ ] TypeScript strict mode: `npm run typecheck`
- [ ] ESLint clean: `npm run lint`

```bash
# Run these commands
npm run lint
npm run typecheck
npm run build
```

### Dependency Security
- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Review critical dependency updates
- [ ] Lock all dependency versions in package-lock.json
- [ ] Document any known issues with dependencies

```bash
npm audit
npm audit fix
npm ci # Use ci instead of install for locked versions
```

### Configuration Review
- [ ] `.env.example` is complete and documented
- [ ] `.env` is in `.gitignore` ✅
- [ ] All required environment variables listed
- [ ] Production `.env` values prepared (not committed)
- [ ] API endpoints configured for production URLs

---

## Day Before Deployment

### Infrastructure Setup
- [ ] Production database created (Supabase)
- [ ] Redis instance running and accessible
- [ ] Load balancer / reverse proxy configured
- [ ] SSL/TLS certificates installed
- [ ] DNS records updated (if domain changing)
- [ ] Firewall rules configured

### Security Hardening
- [ ] All API keys rotated and updated
- [ ] ServiceNow credentials rotated ✅
- [ ] SESSION_SECRET generated:
  ```bash
  node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] CORS_ORIGIN set to production domain(s)
- [ ] Rate limiting configured

### Monitoring Setup
- [ ] Error tracking enabled (Sentry)
- [ ] Centralized logging configured
- [ ] Uptime monitoring enabled
- [ ] Alert rules created
- [ ] Dashboards set up

### Backup & Disaster Recovery
- [ ] Database backups configured
- [ ] Session store backups configured
- [ ] Rollback plan documented
- [ ] Recovery procedures tested

---

## Deployment Day

### Pre-Deployment Tests
- [ ] Test build produces no errors: `npm run build`
- [ ] Built application runs locally
- [ ] All API endpoints respond correctly
- [ ] Session storage working: `redis-cli PING`
- [ ] Database connection successful
- [ ] Rate limiting working

### Deployment Steps

#### Step 1: Code Deployment
- [ ] Pull latest production branch
- [ ] Install dependencies: `npm ci`
- [ ] Build application: `npm run build`
- [ ] Copy built files to server

#### Step 2: Environment Setup
- [ ] Copy `.env.production` to `.env` on server
- [ ] Verify all secrets are set
- [ ] Verify database URL is correct
- [ ] Verify Redis URL is correct
- [ ] Verify API endpoints are production URLs

#### Step 3: Service Start
- [ ] Stop old service (if applicable)
- [ ] Start new service with process manager
- [ ] Verify service is running: `curl /api/health`
- [ ] Check logs for startup errors
- [ ] Verify session store is connected

#### Step 4: Smoke Testing
After deployment, run these tests:

```bash
# Test 1: Health check
curl https://yourdomain.com/api/health
# Should return: {"status":"ok","message":"Backend is running"}

# Test 2: CORS validation
curl -H "Origin: https://yourdomain.com" \
  https://yourdomain.com/api/health
# Should NOT return CORS error

# Test 3: Rate limiting
for i in {1..10}; do curl https://yourdomain.com/api/health; done
# Should be fast

# Test 4: Session creation
curl -X POST https://yourdomain.com/api/jira/connect \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://test.atlassian.net","email":"test@example.com","apiToken":"test"}'
# Should receive session cookie

# Test 5: Security headers
curl -I https://yourdomain.com
# Should see Strict-Transport-Security header
```

#### Step 5: Functional Testing
- [ ] Log in to application
- [ ] Configure LLM provider (test connection)
- [ ] Test Jira integration (test connection)
- [ ] Test ServiceNow integration (test connection)
- [ ] Generate test cases
- [ ] Save and retrieve settings
- [ ] Verify no console errors in browser

---

## Post-Deployment

### Monitoring
- [ ] Check error tracking (Sentry) for new errors
- [ ] Monitor CPU and memory usage
- [ ] Monitor API response times
- [ ] Monitor session count
- [ ] Monitor external API failures

### Validation
- [ ] Application responsive
- [ ] No errors in logs
- [ ] Database queries performing well
- [ ] Session persistence working
- [ ] All features functional

### Communication
- [ ] Notify users of deployment
- [ ] Provide status updates
- [ ] Document deployment details
- [ ] Share incident contacts

---

## If Issues Occur

### Troubleshooting

#### Application Won't Start
```bash
# Check logs
tail -f logs/error.log

# Verify environment
echo $NODE_ENV
echo $CORS_ORIGIN

# Check dependencies
npm ls

# Restart service
pm2 restart app
```

#### High Memory Usage
```bash
# Check session store
redis-cli INFO memory
redis-cli DBSIZE

# Clear old sessions
redis-cli FLUSHDB

# Restart app
pm2 restart app
```

#### Database Connection Failed
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check environment
echo $DATABASE_URL

# Restart database
systemctl restart postgresql
```

#### Rate Limiting Blocking Users
```bash
# Disable temporarily (not recommended)
# Edit server.ts, remove rate limiting middleware
# Rebuild and redeploy

# Or adjust limits in code
```

### Rollback Procedure
If deployment fails critically:

```bash
# Option 1: Revert to previous version
git revert HEAD
npm ci
npm run build
pm2 restart app

# Option 2: Deploy backup version
git checkout previous-tag
npm ci
npm run build
pm2 restart app

# Option 3: Restore database from backup
# (if database was modified)
```

---

## Post-Deployment Verification (24 hours)

### System Health
- [ ] No critical errors in logs
- [ ] Response times normal
- [ ] Database performance acceptable
- [ ] Memory usage stable
- [ ] CPU usage under control

### User Feedback
- [ ] No user reports of issues
- [ ] Features working as expected
- [ ] Performance acceptable
- [ ] No security concerns reported

### Metrics Review
- [ ] Check deployment metrics
- [ ] Review error rates
- [ ] Analyze usage patterns
- [ ] Verify rate limiting effectiveness

---

## Production Environment Variables Reference

**Required:**
```bash
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=<strong-random-secret>
PORT=8080

# Redis (for session storage)
REDIS_HOST=redis.yourcompany.com
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>
REDIS_DB=0

# Database (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...

# Error Tracking
SENTRY_DSN=https://key@sentry.io/project

# LLM Providers
VITE_OPENAI_API_KEY=sk-...
VITE_GROQ_API_KEY=gsk_...
VITE_AZURE_OPENAI_API_KEY=...
VITE_CLAUDE_API_KEY=sk-ant-...

# Integrations
VITE_JIRA_API_ENDPOINT=https://yourcompany.atlassian.net
VITE_SERVICENOW_API_ENDPOINT=https://yourinstance.service-now.com
```

---

## Deployment Runbook Template

```
DEPLOYMENT RUNBOOK - [Date]
============================

Deployment Time: [Start time]
Deployed By: [Name]
Version: [Git commit hash]
Changes: [Summary of changes]

Pre-Deployment Checklist: [✅/❌]
Deployment Success: [✅/❌]
All Tests Passing: [✅/❌]

Issues Encountered:
- [List any issues and resolutions]

Monitoring Status:
- CPU: [OK/WARNING/ERROR]
- Memory: [OK/WARNING/ERROR]
- Database: [OK/WARNING/ERROR]
- Redis: [OK/WARNING/ERROR]

Sign-off:
- Deployed By: _______________
- Reviewed By: _______________
- Date/Time: _______________
```

---

## Common Production Pitfalls to Avoid

❌ **DON'T:**
- Commit `.env` file to git
- Use development secrets in production
- Deploy without running tests
- Change code after deployment starts
- Skip database backups
- Ignore error logs
- Use hardcoded values instead of env vars
- Deploy at peak traffic time
- Skip rollback testing

✅ **DO:**
- Use process manager (PM2, systemd)
- Enable health checks
- Monitor logs continuously
- Keep backups up to date
- Test rollback procedures
- Document everything
- Use feature flags for gradual rollouts
- Have a communication plan
- Monitor for 24 hours post-deployment

---

## Support & Escalation

**If critical issues occur:**

1. **Immediate Actions:**
   - [ ] Alert on-call engineer
   - [ ] Start incident response
   - [ ] Begin investigating root cause
   - [ ] Prepare rollback plan

2. **Communication:**
   - [ ] Notify stakeholders
   - [ ] Provide status updates every 30 min
   - [ ] Set expectation for resolution

3. **Resolution:**
   - [ ] Document findings
   - [ ] Fix root cause
   - [ ] Thoroughly test before redeployment
   - [ ] Post-mortem within 24 hours

---

## Additional Resources

- [PRODUCTION_READINESS_REVIEW.md](PRODUCTION_READINESS_REVIEW.md) - Full review
- [CRITICAL_FIXES_IMPLEMENTATION.md](CRITICAL_FIXES_IMPLEMENTATION.md) - Implementation guide
- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) - Security details
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Detailed checklist
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide

---

**Last Updated:** December 15, 2025  
**Next Review:** After each production deployment
