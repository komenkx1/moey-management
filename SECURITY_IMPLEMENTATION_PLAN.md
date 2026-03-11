# Security Enhancement Implementation Plan

**Start Date:** 11 Maret 2026  
**Target Completion:** 25 Maret 2026 (2 weeks)  
**Priority:** HIGH

---

## 🎯 Goals

1. Harden CSP headers untuk production
2. Implement server-side rate limiting
3. Add missing security headers
4. Perform penetration testing
5. Achieve security score 9.5/10

---

## 📅 Week 1: Critical Security (11-17 Maret)

### Day 1-2: CSP Hardening

#### Task 1.1: Implement CSP Nonce Generation
**File:** `apps/web/next.config.js`

```javascript
// Add nonce generation for production
const crypto = require('crypto');

function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

// In headers() function
async headers() {
  const isProduction = process.env.NODE_ENV === 'production';
  const nonce = isProduction ? generateNonce() : undefined;
  
  const csp = isProduction
    ? [
        "default-src 'self'",
        `script-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline' 'unsafe-eval'"}`,
        `style-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"}`,
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co",
        "frame-src 'self' https://*.supabase.co",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ")
    : [
        // Development CSP (current relaxed version)
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co",
        "frame-src 'self' https://*.supabase.co",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
      ].join("; ");
  
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: csp,
        },
        // ... rest of headers
      ],
    },
  ];
}
```

**Testing:**
```bash
# Build production
npm run build

# Test CSP
curl -I https://your-app.vercel.app | grep -i content-security

# Check browser console for CSP violations
```

**Acceptance Criteria:**
- [ ] Production build has strict CSP (no unsafe-inline/unsafe-eval)
- [ ] Development build still works with HMR
- [ ] No CSP violations in browser console
- [ ] All features work correctly

---

#### Task 1.2: Add Missing Security Headers
**File:** `apps/web/next.config.js`

```javascript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        // ... existing headers ...
        
        // NEW: HSTS (requires HTTPS)
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        
        // NEW: Cross-Origin Isolation
        {
          key: "Cross-Origin-Embedder-Policy",
          value: "require-corp",
        },
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin",
        },
        {
          key: "Cross-Origin-Resource-Policy",
          value: "same-origin",
        },
      ],
    },
  ];
}
```

**Testing:**
```bash
# Check headers
curl -I https://your-app.vercel.app

# Verify HSTS
curl -I https://your-app.vercel.app | grep -i strict-transport

# Test cross-origin isolation
# Open browser DevTools > Application > Security
```

**Acceptance Criteria:**
- [ ] All new headers present in production
- [ ] HSTS working (HTTPS only)
- [ ] Cross-origin isolation working
- [ ] No breaking changes with Supabase/Sentry

---

### Day 3-4: Server-Side Rate Limiting

#### Option A: Vercel Edge Middleware (Recommended for Vercel deployment)

**Step 1: Install Dependencies**
```bash
cd apps/web
npm install @upstash/ratelimit @upstash/redis
```

**Step 2: Setup Upstash Redis**
1. Go to https://upstash.com
2. Create free Redis database
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Add to `.env.local`:
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Step 3: Create Middleware**
**File:** `apps/web/src/middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create rate limiter
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'kemana:ratelimit',
})

export async function middleware(request: NextRequest) {
  // Skip rate limiting in development
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }

  // Get identifier (IP or user ID)
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const userId = request.headers.get('x-user-id') // From auth
  const identifier = userId || ip

  // Check rate limit
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier)

  // Add rate limit headers
  const response = success 
    ? NextResponse.next()
    : new Response('Rate limit exceeded. Please try again later.', { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        },
      })

  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())

  return response
}

// Configure which routes to apply middleware
export const config = {
  matcher: [
    // Apply to API routes only
    '/api/:path*',
    // Skip static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Step 4: Add Rate Limit Monitoring**
**File:** `apps/web/src/lib/rate-limit-monitor.ts`

```typescript
export async function logRateLimitViolation(
  identifier: string,
  endpoint: string
) {
  // Log to Sentry
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureMessage('Rate limit exceeded', {
      level: 'warning',
      tags: {
        identifier,
        endpoint,
      },
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`Rate limit exceeded for ${identifier} on ${endpoint}`);
  }
}
```

**Testing:**
```bash
# Test rate limiting
for i in {1..150}; do
  curl https://your-app.vercel.app/api/test
done

# Should see 429 after 100 requests
```

**Acceptance Criteria:**
- [ ] Rate limiting active in production
- [ ] 429 response after limit exceeded
- [ ] Rate limit headers present
- [ ] Monitoring in Sentry
- [ ] No impact on legitimate users

---

#### Option B: Supabase Edge Functions (Alternative)

**File:** `supabase/functions/rate-limit/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RATE_LIMITS = {
  sync: { requests: 100, window: 60 }, // 100 req/min
  auth: { requests: 10, window: 60 },  // 10 req/min
  default: { requests: 60, window: 60 }, // 60 req/min
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // Get user from JWT
  const authHeader = req.headers.get('Authorization')
  const { data: { user } } = await supabase.auth.getUser(authHeader?.split(' ')[1])
  
  const userId = user?.id || req.headers.get('x-forwarded-for') || 'anonymous'
  const endpoint = req.headers.get('x-endpoint') || 'default'
  
  // Check rate limit (implement with Redis or Supabase table)
  const isAllowed = await checkRateLimit(userId, endpoint)
  
  if (!isAllowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
})

async function checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
  // Implement rate limit check
  // Use Supabase table or external Redis
  return true // Placeholder
}
```

---

### Day 5: Penetration Testing

#### Task 3.1: Automated Security Scanning

**Install Tools:**
```bash
# OWASP ZAP
docker pull owasp/zap2docker-stable

# Nuclei
go install -v github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest
```

**Run Scans:**
```bash
# OWASP ZAP Baseline Scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-app.vercel.app \
  -r zap-report.html

# Nuclei Vulnerability Scan
nuclei -u https://your-app.vercel.app \
  -t cves/ \
  -o nuclei-report.txt

# npm Audit
npm audit --production
npm audit fix
```

**Acceptance Criteria:**
- [ ] OWASP ZAP scan completed
- [ ] Nuclei scan completed
- [ ] npm audit clean (no high/critical)
- [ ] All findings documented

---

#### Task 3.2: Manual Penetration Testing

**Test Checklist:**

**1. Authentication Testing**
```bash
# Test without auth token
curl https://your-app.vercel.app/api/entries

# Test with invalid token
curl -H "Authorization: Bearer invalid" \
  https://your-app.vercel.app/api/entries

# Test with expired token
curl -H "Authorization: Bearer expired_token" \
  https://your-app.vercel.app/api/entries
```

**2. Authorization Testing (IDOR)**
```bash
# Try accessing other user's data
curl -H "Authorization: Bearer user1_token" \
  https://your-app.vercel.app/api/entries/user2_entry_id

# Try modifying other user's data
curl -X PUT \
  -H "Authorization: Bearer user1_token" \
  -d '{"text":"hacked"}' \
  https://your-app.vercel.app/api/entries/user2_entry_id
```

**3. XSS Testing**
Test these payloads in all input fields:
```javascript
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')
<iframe src="javascript:alert('XSS')">
```

**4. SQL Injection Testing**
Test these payloads:
```sql
' OR '1'='1
'; DROP TABLE entries; --
' UNION SELECT * FROM users --
```

**5. CSRF Testing**
Create malicious HTML:
```html
<form action="https://your-app.vercel.app/api/entries" method="POST">
  <input name="text" value="hacked" />
  <input name="amount" value="999999" />
</form>
<script>document.forms[0].submit()</script>
```

**Acceptance Criteria:**
- [ ] All authentication tests pass
- [ ] All authorization tests pass (IDOR prevented)
- [ ] All XSS tests pass (no execution)
- [ ] All SQL injection tests pass (no injection)
- [ ] CSRF tests pass (requests blocked)

---

## 📅 Week 2: Enhanced Security (18-25 Maret)

### Day 6-7: Server-Side Validation

**File:** `apps/web/src/lib/validation.ts`

```typescript
import { z } from 'zod'

// Entry validation schema
export const EntrySchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  amount: z.number().int().positive().max(1000000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1).max(100),
  payment_method: z.string().max(100).optional(),
  split: z.object({
    people: z.array(z.string()),
    amounts: z.array(z.number()),
  }).optional(),
})

// Rule validation schema
export const RuleSchema = z.object({
  pattern: z.string().min(1).max(200),
  match: z.enum(['contains', 'equals']),
  category: z.string().min(1).max(100),
})

// Validate entry
export function validateEntry(data: unknown) {
  return EntrySchema.parse(data)
}

// Validate rule
export function validateRule(data: unknown) {
  return RuleSchema.parse(data)
}
```

**Add to Supabase Edge Function:**
```typescript
// supabase/functions/validate-entry/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const EntrySchema = z.object({
  text: z.string().min(1).max(500),
  amount: z.number().int().positive().max(1000000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1).max(100),
})

serve(async (req) => {
  try {
    const data = await req.json()
    const validated = EntrySchema.parse(data)
    
    return new Response(
      JSON.stringify({ success: true, data: validated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Acceptance Criteria:**
- [ ] Zod schemas defined
- [ ] Server-side validation implemented
- [ ] Validation errors returned
- [ ] Tests added

---

### Day 8-9: Security Audit

**Code Review Checklist:**
- [ ] Review all auth code (`useAuth.ts`, `supabase.ts`)
- [ ] Review all RLS policies (`SUPABASE_SETUP.sql`)
- [ ] Review all input validation (`security.ts`, `validation.ts`)
- [ ] Review all API endpoints
- [ ] Review all error handling
- [ ] Review all sensitive data handling

**Dependency Audit:**
```bash
# npm audit
npm audit

# Snyk scan
npx snyk test
npx snyk monitor

# Check outdated packages
npm outdated
```

**Configuration Audit:**
- [ ] Review `.env.local.example`
- [ ] Review `next.config.js`
- [ ] Review Supabase project settings
- [ ] Review Vercel project settings
- [ ] Review Sentry project settings

**Acceptance Criteria:**
- [ ] Code review completed
- [ ] Dependency audit clean
- [ ] Configuration audit completed
- [ ] All findings documented
- [ ] Remediation plan created

---

### Day 10: Documentation & Monitoring

**Create Security Documentation:**
- [ ] Update `SECURITY_AUDIT.md` with findings
- [ ] Create `SECURITY_BEST_PRACTICES.md`
- [ ] Update `README.md` with security section
- [ ] Create incident response plan

**Setup Monitoring:**
```typescript
// apps/web/src/lib/security-monitoring.ts
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
) {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureMessage(`Security: ${event}`, {
      level: severity === 'critical' ? 'error' : 'warning',
      tags: {
        security_event: event,
        severity,
      },
      extra: metadata,
    });
  }
}

// Usage examples
logSecurityEvent('Rate limit exceeded', 'medium', { ip, endpoint })
logSecurityEvent('Invalid auth token', 'high', { userId })
logSecurityEvent('XSS attempt detected', 'critical', { payload })
```

**Acceptance Criteria:**
- [ ] Security documentation complete
- [ ] Monitoring setup complete
- [ ] Alerts configured in Sentry
- [ ] Incident response plan ready

---

## ✅ Final Checklist

### Critical (Must Have)
- [ ] CSP hardened for production
- [ ] Server-side rate limiting implemented
- [ ] Penetration testing completed
- [ ] All critical vulnerabilities fixed

### Important (Should Have)
- [ ] Additional security headers added
- [ ] Server-side validation implemented
- [ ] Security audit completed
- [ ] Monitoring setup

### Nice to Have
- [ ] Security documentation complete
- [ ] Incident response plan
- [ ] Continuous security monitoring
- [ ] Regular security reviews scheduled

---

## 📊 Success Metrics

**Target Security Score: 9.5/10**

**Breakdown:**
- Headers: 10/10 (all headers, strict CSP)
- Authentication: 9/10 (already excellent)
- Authorization: 9/10 (RLS working well)
- Input Validation: 9/10 (client + server)
- Rate Limiting: 9/10 (client + server)
- Monitoring: 9/10 (Sentry + security events)
- Testing: 10/10 (penetration testing done)

---

## 🚀 Deployment

After all tasks complete:

1. **Test in staging:**
   ```bash
   npm run build
   npm run start
   ```

2. **Deploy to production:**
   ```bash
   vercel --prod
   ```

3. **Verify security headers:**
   ```bash
   curl -I https://your-app.vercel.app
   ```

4. **Monitor for issues:**
   - Check Sentry dashboard
   - Monitor rate limit violations
   - Watch for security events

---

**Last Updated:** 11 Maret 2026  
**Status:** Ready to implement  
**Estimated Effort:** 2 weeks (80 hours)
