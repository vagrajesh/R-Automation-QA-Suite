# Implementation Guide: Critical Production Fixes
**Created:** December 15, 2025

This guide provides step-by-step instructions to fix the 3 critical production issues.

---

## Issue #1: Exposed Credentials in .env

### Status: ⚠️ IMMEDIATE ACTION REQUIRED

Your `.env` file contains real ServiceNow credentials. These must be rotated immediately.

### Action Steps:

1. **STEP 1: Rotate ServiceNow Password**
   - Log into your ServiceNow instance
   - Go to System Security > Users
   - Find your admin user
   - Change password
   - Update `.env` with new password

2. **STEP 2: Rotate All API Keys**
   - OpenAI: https://platform.openai.com/api-keys → Delete and create new key
   - Groq: https://console.groq.com → Regenerate API key
   - Azure OpenAI: Azure Portal → Regenerate keys
   - Claude (Anthropic): https://console.anthropic.com → Create new API key
   - Jira: Atlassian Security → API Tokens → Create new
   - TestLeaf: Contact provider for key rotation

3. **STEP 3: Verify .env is Protected**
   ```bash
   # This should return ".env" (meaning it's ignored)
   git check-ignore .env
   
   # Verify .env is not staged for commit
   git status
   ```

4. **STEP 4: Create .env.example for Team**
   ✅ Already created and properly documented

### Verification:
```bash
# Review what would be committed
git diff --cached --name-only

# Should NOT include .env
# If it does, run: git rm --cached .env
```

---

## Issue #2: Session Storage Not Persistent

### Current State
Sessions stored in memory - **LOST on server restart**

### Solution: Implement Redis Session Store (Recommended)

#### STEP 1: Install Dependencies
```bash
npm install connect-redis redis
npm install --save-dev @types/connect-redis
```

#### STEP 2: Update server.ts

Find this section in `src/server.ts` (around line 37-48):
```typescript
app.use(
  session({
    secret: SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);
```

Replace it with:
```typescript
import { createClient, RedisClientType } from 'redis';
import RedisStore from 'connect-redis';

// Initialize Redis client
let redisClient: RedisClientType | null = null;

async function initRedis() {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });
    
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.on('connect', () => console.log('✅ Redis connected'));
    
    await redisClient.connect();
  } catch (error) {
    console.warn('⚠️ Redis not available, using in-memory sessions (dev only)');
    console.warn('   For production, ensure Redis is running');
  }
}

// Call this at startup
await initRedis();

// Create session store (will fallback to memory if Redis unavailable)
const sessionStore = redisClient 
  ? new RedisStore({ client: redisClient })
  : undefined;

app.use(
  session({
    store: sessionStore,
    secret: SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);
```

#### STEP 3: Update .env

Add Redis configuration:
```bash
# Redis Configuration (Optional - uses in-memory if not available)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### STEP 4: Verify Redis is Running

**On Windows with Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Or install Redis locally:**
- Download from https://github.com/microsoftarchive/redis/releases
- Or use WSL: `wsl apt-get install redis-server`

#### STEP 5: Test Session Persistence

```bash
# Terminal 1: Start the app
npm run dev

# Terminal 2: Test session endpoint
curl -X POST http://localhost:8080/api/jira/connect \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://example.atlassian.net","email":"test@example.com","apiToken":"test"}'

# Should see session stored in Redis
redis-cli
> KEYS *
> GET "sessionid:..."
```

---

## Issue #3: No Rate Limiting

### Current State
API endpoints are unprotected and vulnerable to:
- Brute force attacks
- DDoS attacks
- Resource exhaustion

### Solution: Add express-rate-limit

#### STEP 1: Install Dependencies
```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

#### STEP 2: Create Rate Limiting Middleware

Add new file `src/middleware/rateLimit.ts`:
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
});

// Strict rate limiter for login attempts
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many failed attempts, please try again later.',
});

// Very strict for credential endpoints
export const credentialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  skipSuccessfulRequests: false,
  message: 'Too many credential attempts, please try again later.',
});
```

#### STEP 3: Update server.ts

Add near the top (after middleware setup):
```typescript
import { generalLimiter, strictLimiter, credentialLimiter } from './middleware/rateLimit';

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Apply strict rate limiting to sensitive endpoints
app.post('/api/jira/connect', strictLimiter, async (req: Request, res: Response) => {
  // ... existing code
});

app.post('/api/servicenow/connect', strictLimiter, async (req: Request, res: Response) => {
  // ... existing code
});
```

#### STEP 4: Update Development Environment

The limiter is skipped in development mode. For testing:
```bash
NODE_ENV=production npm run dev
```

#### STEP 5: Test Rate Limiting

```bash
# Run 6 rapid requests (should fail on 6th)
for i in {1..6}; do
  curl http://localhost:8080/api/health
  echo "\nRequest $i"
done

# Should see error on request 6
```

---

## Summary: What to Do Next

### Immediate (Today)
- [ ] 1. Rotate ServiceNow credentials in `.env`
- [ ] 2. Verify `.env` is gitignored: `git check-ignore .env`
- [ ] 3. Start implementing Session Store (Steps 1-2)

### This Week
- [ ] 4. Set up Redis (Step 3-5 of Session Store)
- [ ] 5. Implement Rate Limiting (All steps)
- [ ] 6. Run npm audit and fix vulnerabilities

### Before Production
- [ ] 7. Test session persistence after server restart
- [ ] 8. Load test with rate limiting enabled
- [ ] 9. Review all .env variables are production-ready
- [ ] 10. Document deployment procedure

---

## Quick Reference Commands

```bash
# Check current status
git status
npm audit

# Install fixes
npm install connect-redis redis express-rate-limit
npm install --save-dev @types/connect-redis @types/express-rate-limit

# Test session storage
redis-cli PING

# Verify rate limiting works
for i in {1..20}; do curl http://localhost:8080/api/health; done

# TypeScript check
npm run typecheck

# Build for production
npm run build
```

---

## Rollback Plan (If Issues)

If you need to rollback rate limiting:
```bash
npm uninstall express-rate-limit
npm uninstall --save-dev @types/express-rate-limit
# Remove rate limit middleware from server.ts
```

If you need to rollback session store:
```bash
npm uninstall connect-redis redis
# Remove Redis code from server.ts
# Sessions will revert to in-memory (development only)
```

---

## Need Help?

- Redis Setup: https://redis.io/docs/getting-started/
- express-rate-limit Docs: https://github.com/nfriedly/express-rate-limit
- connect-redis Docs: https://github.com/tj/connect-redis
- ESLint/TypeScript: Run `npm run typecheck`

---

**Created:** December 15, 2025  
**Status:** Implementation Guide Ready
