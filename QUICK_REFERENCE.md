# Quick Reference Guide - Production Issues & Fixes
**Date:** December 15, 2025  
**Status:** Ready to Implement

---

## 🔴 Critical Issues at a Glance

| Issue | Problem | Fix Time | Impact |
|-------|---------|----------|--------|
| **Session Storage** | In-memory (lost on restart) | 2-3 hrs | 🔴 CRITICAL |
| **Rate Limiting** | No protection from attacks | 1-2 hrs | 🔴 CRITICAL |
| **Exposed Credentials** | Real password in .env | 30 min | 🔴 CRITICAL |

---

## Issue #1: Sessions Lost on Restart

**Current Code:**
```typescript
// ❌ NO PERSISTENT STORE
app.use(session({
  secret: SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
}));
```

**Fix:**
```bash
npm install connect-redis redis
```

Then update `src/server.ts` - See CRITICAL_FIXES_IMPLEMENTATION.md for full code.

**Test:**
```bash
# Start app
npm run dev

# In another terminal, save a session
curl -X POST http://localhost:8080/api/jira/connect \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://test.atlassian.net","email":"test@example.com","apiToken":"test"}'

# Stop and restart server - session should still exist
redis-cli KEYS "*" # Should show session data
```

---

## Issue #2: No Rate Limiting

**Current Code:**
```typescript
// ❌ NO RATE LIMITING
app.post('/api/jira/connect', async (req: Request, res: Response) => {
  // Anyone can make unlimited requests
});
```

**Fix:**
```bash
npm install express-rate-limit
```

Add to `src/server.ts`:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  skip: () => process.env.NODE_ENV === 'development',
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.post('/api/jira/connect', strictLimiter, async (req, res) => {
  // Now protected
});
```

**Test:**
```bash
# Should work for first 5 requests
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/jira/connect \
    -H "Content-Type: application/json" \
    -d '{"baseUrl":"https://test.atlassian.net","email":"test@example.com","apiToken":"test"}'
  echo "Request $i"
done

# Request 6 should fail with 429 Too Many Requests
curl -X POST http://localhost:8080/api/jira/connect \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://test.atlassian.net","email":"test@example.com","apiToken":"test"}'
# Should return: 429 Too Many Requests
```

---

## Issue #3: Exposed Credentials

**Current State:**
```dotenv
VITE_SERVICENOW_PASSWORD=xVFx2o*B5^Yi  ← REAL PASSWORD EXPOSED
```

**Fix:**

1. **Immediately:**
   ```bash
   # Go to ServiceNow
   # Settings → Users → Change admin password
   # Update .env with new password
   ```

2. **For Production:**
   - Use Azure Key Vault
   - Use AWS Secrets Manager
   - Never store credentials in .env file

**Verify:**
```bash
# This should return ".env" (means it's properly ignored)
git check-ignore .env

# This should NOT show .env in staged files
git status
```

---

## 🟠 High Priority Issues

### #4: No Request Validation
```bash
npm install express-validator joi
```

### #5: No CSRF Protection
```bash
npm install csurf
```

### #6: No Input Sanitization
```bash
npm install xss sanitize-html
```

### #7: No Security Headers
```bash
npm install helmet
```

### #8: No Error Tracking
```bash
npm install @sentry/node
```

---

## Implementation Timeline

```
Monday (2 hours):
  ├─ Credential rotation (30 min)
  ├─ Verify .env protection (5 min)
  └─ Install packages (10 min)

Tuesday-Wednesday (6 hours):
  ├─ Redis session store implementation (2-3 hours)
  ├─ Redis setup & testing (1-2 hours)
  └─ Rate limiting implementation (1-2 hours)

Thursday-Friday (2-4 hours):
  ├─ npm audit and fixes (1 hour)
  ├─ Security headers (30 min)
  ├─ Error tracking setup (1 hour)
  └─ Testing & validation (1 hour)

TOTAL: 10-16 hours over 1 week
```

---

## Installation Checklist

### Critical (MUST DO)
```bash
npm install connect-redis redis express-rate-limit
npm install --save-dev @types/connect-redis @types/express-rate-limit
```

### High Priority (SHOULD DO)
```bash
npm install helmet express-validator @sentry/node
npm install --save-dev @types/express-validator
```

### Optional (NICE TO HAVE)
```bash
npm install winston pino xss sanitize-html csurf joi
npm install --save-dev @types/xss @types/csurf @types/joi
```

---

## Production Environment Variables

```bash
# REQUIRED
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=<strong-random-secret>

# REDIS (for sessions)
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>

# SENTRY (error tracking)
SENTRY_DSN=https://key@sentry.io/project

# API KEYS (rotated)
VITE_OPENAI_API_KEY=sk-...
VITE_GROQ_API_KEY=gsk_...
VITE_AZURE_OPENAI_API_KEY=...
VITE_CLAUDE_API_KEY=sk-ant-...
VITE_JIRA_API_ENDPOINT=https://yourcompany.atlassian.net
VITE_SERVICENOW_API_ENDPOINT=https://yourinstance.service-now.com
```

---

## Pre-Production Commands

```bash
# Security
npm audit
npm audit fix
git check-ignore .env

# Quality
npm run lint
npm run typecheck
npm run build

# Testing
npm test (if tests exist)
npm run preview

# Redis verification
redis-cli PING
# Should return: PONG
```

---

## Quick Troubleshooting

**Sessions not persisting?**
```bash
# Check Redis is running
redis-cli PING

# Check Redis connection in logs
npm run dev

# Should see: ✅ Redis connected
```

**Rate limiting not working?**
```bash
# Verify NODE_ENV is not 'development'
NODE_ENV=production npm run dev

# Test with curl
for i in {1..20}; do curl http://localhost:8080/api/health; done

# Should get 429 Too Many Requests after 10
```

**Credentials still exposed?**
```bash
# Check .env is in .gitignore
cat .gitignore | grep "\.env"
# Should show: .env

# Verify not staged
git status
# .env should NOT be listed
```

---

## Critical Commands Reference

```bash
# Generate strong SESSION_SECRET
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Check npm vulnerabilities
npm audit

# Check TypeScript
npm run typecheck

# Check ESLint
npm run lint

# Build for production
npm run build

# Verify .env protected
git check-ignore .env

# Test Redis
redis-cli PING

# Monitor logs (macOS/Linux)
tail -f logs/error.log

# Monitor logs (Windows)
Get-Content logs\error.log -Wait
```

---

## Deployment Checklist (TL;DR)

- [ ] All 3 critical fixes implemented
- [ ] npm audit passed
- [ ] npm run lint passed
- [ ] npm run typecheck passed
- [ ] npm run build successful
- [ ] .env properly gitignored
- [ ] All API keys rotated
- [ ] SESSION_SECRET generated
- [ ] Redis running in production
- [ ] Database configured
- [ ] Logging set up
- [ ] Error tracking configured
- [ ] Smoke tests passed
- [ ] 24-hour monitoring completed

---

## Success Metrics After Fixes

✅ **Sessions persist** across server restarts  
✅ **Rate limiting active** on all API endpoints  
✅ **Credentials secured** in vault/secrets manager  
✅ **No npm audit errors** - dependencies clean  
✅ **Production build** generates clean output  
✅ **All tests passing** - code quality maintained  

---

## Need More Details?

- **Full Implementation:** See CRITICAL_FIXES_IMPLEMENTATION.md
- **Security Details:** See SECURITY_AUDIT.md  
- **Deployment Guide:** See DEPLOYMENT_CHECKLIST.md
- **Complete Review:** See PRODUCTION_READINESS_REVIEW.md

---

**Last Updated:** December 15, 2025  
**Status:** Ready for Implementation
