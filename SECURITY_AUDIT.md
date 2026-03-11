# Security Audit & Enhancement Plan

**Date:** 11 Maret 2026  
**Project:** KeMana Expense Tracker  
**Version:** 2.0.0

---

## 🔍 Current Security Status

### ✅ Already Implemented

#### 1. Security Headers (next.config.js)
- ✅ **Content-Security-Policy (CSP)**
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-eval' 'unsafe-inline'` ⚠️ (needs tightening)
  - `style-src 'self' 'unsafe-inline'` ⚠️ (needs tightening)
  - `connect-src` limited to Supabase & Sentry
  - `frame-src` limited to Supabase
  
- ✅ **X-Content-Type-Options: nosniff**
- ✅ **X-Frame-Options: DENY**
- ✅ **X-XSS-Protection: 1; mode=block**
- ✅ **Referrer-Policy: strict-origin-when-cross-origin**
- ✅ **Permissions-Policy: camera=(), microphone=(), geolocation=()**

#### 2. Database Security
- ✅ **Row Level Security (RLS)** active
- ✅ **Owner isolation** (`owner_id = auth.uid()`)
- ✅ **Cascade delete** on user deletion
- ✅ **SQL injection prevention** (parameterized queries)

#### 3. Application Security
- ✅ **Input validation** (security.ts)
- ✅ **Input sanitization** (HTML, category, amount, date)
- ✅ **AES-256 encryption** for localStorage
- ✅ **XSS prevention** (no unsafe HTML render)
- ✅ **Rate limiting** (client-side, memory-capped at 1000 entries)
- ✅ **Memory leak prevention**

#### 4. Authentication & Session
- ✅ **OAuth 2.0** (Google)
- ✅ **Session persistence** (encrypted localStorage)
- ✅ **Token refresh** handling
- ✅ **Secure token storage**

#### 5. Privacy
- ✅ **PII redaction** in error logs (Sentry beforeSend)
- ✅ **No sensitive data** in console (production)
- ✅ **User data deletion** on account deletion

---

## ⚠️ Security Gaps & Improvements Needed

### 1. CSP Headers - HIGH PRIORITY

**Current Issues:**
- `'unsafe-eval'` in script-src (needed for Next.js dev, should be removed in production)
- `'unsafe-inline'` in script-src and style-src (XSS risk)

**Recommended Fix:**
```javascript
// Production CSP (strict)
const productionCSP = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{RANDOM}'", // Use nonce for inline scripts
  "style-src 'self' 'nonce-{RANDOM}'", // Use nonce for inline styles
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
  "upgrade-insecure-requests"
].join("; ");

// Development CSP (relaxed for HMR)
const developmentCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // ... rest same as current
].join("; ");
```

**Action Items:**
- [ ] Implement CSP nonce generation for production
- [ ] Remove `unsafe-eval` and `unsafe-inline` in production
- [ ] Add `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- [ ] Add `upgrade-insecure-requests` directive
- [ ] Test CSP in production build

---

### 2. Additional Security Headers - MEDIUM PRIORITY

**Missing Headers:**
- ❌ **Strict-Transport-Security (HSTS)**
- ❌ **Cross-Origin-Embedder-Policy (COEP)**
- ❌ **Cross-Origin-Opener-Policy (COOP)**
- ❌ **Cross-Origin-Resource-Policy (CORP)**

**Recommended Implementation:**
```javascript
{
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
},
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
```

**Action Items:**
- [ ] Add HSTS header (requires HTTPS in production)
- [ ] Add COEP, COOP, CORP headers
- [ ] Test cross-origin isolation
- [ ] Verify no breaking changes with Supabase/Sentry

---

### 3. Rate Limiting - HIGH PRIORITY

**Current Status:**
- ✅ Client-side rate limiting (security.ts)
- ❌ Server-side rate limiting (Supabase Edge Functions)

**Recommended Implementation:**

**Option A: Supabase Edge Functions (Recommended)**
```typescript
// supabase/functions/rate-limit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RATE_LIMITS = {
  sync: { requests: 100, window: 60 }, // 100 req/min
  auth: { requests: 10, window: 60 },  // 10 req/min
}

serve(async (req) => {
  const userId = req.headers.get("x-user-id")
  const endpoint = req.headers.get("x-endpoint")
  
  // Check rate limit in Redis/KV store
  const isAllowed = await checkRateLimit(userId, endpoint)
  
  if (!isAllowed) {
    return new Response("Rate limit exceeded", { status: 429 })
  }
  
  return new Response("OK", { status: 200 })
})
```

**Option B: Vercel Edge Middleware (if deploying to Vercel)**
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**Action Items:**
- [ ] Choose rate limiting strategy (Supabase Edge Functions vs Vercel Middleware)
- [ ] Implement server-side rate limiting
- [ ] Set appropriate limits per endpoint
- [ ] Add rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
- [ ] Test rate limiting with load testing

---

### 4. Input Validation - MEDIUM PRIORITY

**Current Status:**
- ✅ Client-side validation (security.ts)
- ⚠️ Server-side validation (Supabase RLS only)

**Recommended Enhancement:**
```typescript
// Supabase Edge Function for validation
import { z } from "zod"

const EntrySchema = z.object({
  text: z.string().min(1).max(500),
  amount: z.number().int().positive().max(1000000000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1).max(100),
  payment_method: z.string().max(100).optional(),
})

export async function validateEntry(data: unknown) {
  try {
    return EntrySchema.parse(data)
  } catch (error) {
    throw new Error("Invalid entry data")
  }
}
```

**Action Items:**
- [ ] Add Zod schema validation in Supabase Edge Functions
- [ ] Validate all inputs server-side before DB write
- [ ] Return detailed validation errors
- [ ] Add validation tests

---

### 5. Penetration Testing - HIGH PRIORITY

**Recommended Tests:**

#### A. Automated Security Scanning
```bash
# OWASP ZAP (free, open-source)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-app.vercel.app

# Nuclei (vulnerability scanner)
nuclei -u https://your-app.vercel.app -t cves/

# npm audit (dependency vulnerabilities)
npm audit --production
npm audit fix
```

#### B. Manual Testing Checklist
- [ ] **Authentication Bypass**
  - Try accessing protected routes without auth
  - Try manipulating JWT tokens
  - Try session fixation attacks
  
- [ ] **Authorization Issues (IDOR)**
  - Try accessing other users' entries by changing IDs
  - Try modifying other users' data
  - Test RLS policies thoroughly
  
- [ ] **XSS (Cross-Site Scripting)**
  - Inject `<script>alert('XSS')</script>` in all input fields
  - Test with various XSS payloads
  - Check if output is properly escaped
  
- [ ] **SQL Injection**
  - Try SQL injection in all input fields
  - Test with various SQL payloads
  - Verify parameterized queries
  
- [ ] **CSRF (Cross-Site Request Forgery)**
  - Test state-changing operations without CSRF token
  - Verify SameSite cookie attribute
  
- [ ] **Sensitive Data Exposure**
  - Check browser DevTools for exposed secrets
  - Check network tab for sensitive data in URLs
  - Verify error messages don't leak info
  
- [ ] **Rate Limiting**
  - Test with automated requests
  - Verify 429 responses
  - Check if rate limits are per-user or per-IP

**Action Items:**
- [ ] Run OWASP ZAP baseline scan
- [ ] Run Nuclei vulnerability scan
- [ ] Perform manual penetration testing
- [ ] Document findings and fixes
- [ ] Re-test after fixes

---

### 6. Security Audit - MEDIUM PRIORITY

**Recommended Audits:**

#### A. Code Review
- [ ] Review all authentication code
- [ ] Review all authorization checks
- [ ] Review all input validation
- [ ] Review all database queries
- [ ] Review all API endpoints
- [ ] Review all error handling

#### B. Dependency Audit
```bash
# Check for known vulnerabilities
npm audit

# Check for outdated packages
npm outdated

# Use Snyk for deeper analysis
npx snyk test
npx snyk monitor
```

#### C. Configuration Audit
- [ ] Review Supabase RLS policies
- [ ] Review environment variables
- [ ] Review CORS configuration
- [ ] Review cookie settings
- [ ] Review session timeout settings

**Action Items:**
- [ ] Perform code security review
- [ ] Run dependency audit tools
- [ ] Review all configurations
- [ ] Document security findings
- [ ] Create remediation plan

---

## 📋 Implementation Checklist

### Phase 1: Critical Security (Week 1)
- [ ] **CSP Hardening**
  - [ ] Implement CSP nonce generation
  - [ ] Remove unsafe-eval/unsafe-inline in production
  - [ ] Add missing CSP directives
  - [ ] Test in production build
  
- [ ] **Rate Limiting**
  - [ ] Choose rate limiting strategy
  - [ ] Implement server-side rate limiting
  - [ ] Set appropriate limits
  - [ ] Add rate limit headers
  - [ ] Test with load testing

- [ ] **Penetration Testing**
  - [ ] Run OWASP ZAP scan
  - [ ] Run Nuclei scan
  - [ ] Perform manual testing
  - [ ] Document findings
  - [ ] Fix critical issues

### Phase 2: Enhanced Security (Week 2)
- [ ] **Additional Headers**
  - [ ] Add HSTS header
  - [ ] Add COEP, COOP, CORP headers
  - [ ] Test cross-origin isolation
  - [ ] Verify no breaking changes

- [ ] **Server-side Validation**
  - [ ] Add Zod schema validation
  - [ ] Validate all inputs server-side
  - [ ] Return detailed errors
  - [ ] Add validation tests

- [ ] **Security Audit**
  - [ ] Code security review
  - [ ] Dependency audit
  - [ ] Configuration audit
  - [ ] Document findings

### Phase 3: Continuous Security (Ongoing)
- [ ] **Monitoring**
  - [ ] Set up security alerts in Sentry
  - [ ] Monitor rate limit violations
  - [ ] Monitor authentication failures
  - [ ] Track suspicious activities

- [ ] **Maintenance**
  - [ ] Weekly dependency updates
  - [ ] Monthly security audits
  - [ ] Quarterly penetration testing
  - [ ] Annual third-party audit

---

## 🎯 Priority Matrix

| Task | Priority | Effort | Impact | Status |
|------|----------|--------|--------|--------|
| CSP Hardening | HIGH | Medium | High | 🔴 TODO |
| Server-side Rate Limiting | HIGH | High | High | 🔴 TODO |
| Penetration Testing | HIGH | Medium | High | 🔴 TODO |
| Additional Security Headers | MEDIUM | Low | Medium | 🔴 TODO |
| Server-side Validation | MEDIUM | Medium | Medium | 🔴 TODO |
| Security Audit | MEDIUM | High | Medium | 🔴 TODO |
| Continuous Monitoring | LOW | Low | High | 🔴 TODO |

---

## 📊 Security Score

**Current Score: 7.5/10**

**Breakdown:**
- Headers: 8/10 (good, needs CSP hardening)
- Authentication: 9/10 (excellent)
- Authorization: 9/10 (RLS working well)
- Input Validation: 7/10 (client-side only)
- Rate Limiting: 6/10 (client-side only)
- Monitoring: 8/10 (Sentry active)
- Testing: 6/10 (no penetration testing yet)

**Target Score: 9.5/10**

---

## 🔗 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** 11 Maret 2026  
**Next Review:** After Phase 1 completion
