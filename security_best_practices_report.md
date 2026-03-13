# Security Best Practices Report

## Executive Summary

Scope reviewed: `apps/web` and supporting packages for the KeMana web app, focusing on XSS/input rendering, browser storage, authentication/session handling, and deployment posture for the current `Next.js + React + static export + Capacitor` architecture.

Summary:

- No obvious high-risk DOM XSS sinks were found in the current UI code. I did **not** find `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `eval`, or `new Function` in the reviewed app code.
- The most important current security tradeoff is architectural: the deployed static-export web app now relies on `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` for compatibility. This weakens CSP as a defense-in-depth layer, but does not by itself mean the app is compromised.
- The most important code-level risk is browser storage handling: the app currently describes local encryption as protection against XSS, but the encryption key is derived from a value stored in the same browser storage, so it should be treated as obfuscation rather than a meaningful XSS boundary.
- Authentication appears to rely on the browser-side Supabase client with default persistence behavior. In the presence of an XSS bug, this increases the value of browser storage as a target.

Overall assessment: **no critical findings identified in the reviewed code**, but there are **two medium-priority security posture issues** that should be documented and addressed in roadmap order.

## Critical Findings

No critical findings were identified during this review.

## High Findings

No high findings were identified during this review.

## Medium Findings

### SEC-001: CSP is intentionally weakened for the current static-export deployment

- Severity: Medium
- Location:
  - `apps/web/vercel.json:7`
  - `apps/web/next.config.js:43-50`
- Evidence:

```json
"value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ..."
```

```js
// generated from a local/exported build are not reliable for deployed HTML.
const productionCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
```

- Impact: CSP is no longer a strong mitigation for inline-script XSS payloads in web production. If a script injection bug is introduced elsewhere, CSP will provide much less resistance than a nonce- or hash-based policy.
- Why this exists: the current architecture uses `Next.js` with `output: "export"` and client/runtime inline scripts that are not stable enough to safely whitelist with deploy-time hashes on Vercel.
- Fix:
  - Short term: keep this compromise documented and treat CSP as compatibility-oriented for the static/export target.
  - Long term: split the web production deployment from the Capacitor/static-export deployment and move the web target to a nonce-based CSP.
- Mitigation:
  - Keep dangerous DOM sinks out of the codebase.
  - Add lint/CI checks that block `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, and `javascript:` URLs.
  - Treat imported, synced, and locally stored data as untrusted.
- False positive notes: none. This is an explicit current design decision, not a speculative finding.

### SEC-002: persisted browser state uses deterministic client-side encryption that does not meaningfully protect against XSS

- Severity: Medium
- Location:
  - `apps/web/src/store/use-kemana-store.ts:15-21`
  - `apps/web/src/store/use-kemana-store.ts:42-46`
  - `apps/web/src/store/use-kemana-store.ts:89-95`
  - `apps/web/src/lib/crypto.ts:6-15`
  - `apps/web/src/lib/crypto.ts:31-35`
  - `apps/web/src/store/use-auth-store.ts:20-29`
- Evidence:

```ts
// use-kemana-store.ts
- Protects against XSS attacks that can read localStorage
...
const userId = localStorage.getItem('kemana.auth.userId');
const key = getEncryptionKey(userId);
```

```ts
// crypto.ts
return CryptoJS.SHA256(userId).toString();
```

```ts
// use-auth-store.ts
localStorage.setItem('kemana.auth.userId', session.user.id);
```

- Impact: any XSS that can read localStorage can also read `kemana.auth.userId`, derive the same key, and decrypt the stored Zustand payload. This means the current design is obfuscation for casual inspection, not a strong security boundary.
- Fix:
  - Reword code comments and docs immediately so they do not claim XSS protection.
  - Keep persisted browser state minimal.
  - Do not add sensitive session or financial secrets to this persisted Zustand storage.
- Mitigation:
  - Prefer IndexedDB/local persistence only for low-sensitivity UX state.
  - If stronger local-at-rest protection is ever required, the key must not be derivable entirely from attacker-readable browser storage.
- False positive notes: the currently persisted fields are mostly UI state, which lowers practical impact today.

### SEC-003: browser-side auth/session handling increases the value of XSS against the web target

- Severity: Medium
- Location:
  - `apps/web/src/lib/supabase.ts:21-25`
  - `apps/web/src/hooks/useAuth.ts:79-92`
  - `apps/web/src/hooks/useAuth.ts:142-205`
- Evidence:

```ts
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
```

```ts
const { data: { session }, error } = await supabase.auth.getSession();
...
} = supabase.auth.onAuthStateChange(async (event, session) => {
```

- Impact: the web app is using the browser-side Supabase client for session handling. This is normal for many SPA-style apps, but combined with the weakened CSP posture it means a successful XSS would be materially more valuable.
- Fix:
  - Verify current Supabase persistence behavior explicitly and document it.
  - Long term, consider a stronger web-only auth strategy when the web deployment is split from static export.
- Mitigation:
  - Avoid storing extra identity/session-adjacent data in localStorage.
  - Keep auth flows and callback handling narrow and deterministic.
- False positive notes: this finding is about security posture and exposure, not proof of an exploitable auth flaw in the current code.

## Low Findings

### SEC-004: custom regex-based “sanitization” helpers could create a false sense of safety if reused for HTML rendering

- Severity: Low
- Location: `apps/web/src/lib/security.ts:15-137`
- Evidence:

```ts
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
```

```ts
export function sanitizeInput(input: string): string { ... }
export function sanitizeTransactionText(text: string): string { ... }
```

- Impact: regex-based sanitization is not a safe substitute for a reviewed HTML sanitizer. If a future feature starts rendering HTML and relies on these helpers, that would be risky.
- Current state: a repo search did **not** find active call sites of these helpers outside `security.ts`, and the app currently does not appear to be using raw HTML sinks.
- Fix:
  - Keep these helpers limited to plain-text hygiene only.
  - If rich HTML ever becomes necessary, use DOMPurify and centralize the rendering path.
- Mitigation:
  - Add a code review rule: no HTML rendering without an approved sanitizer and explicit review.

### SEC-005: client-side rate limiting should be treated as UX friction, not a security control

- Severity: Low
- Location:
  - `apps/web/src/hooks/useAuth.ts:237-240`
  - `apps/web/src/lib/rate-limiter.ts:172-199`
  - `apps/web/src/lib/rate-limiter.ts:205-246`
- Evidence:

```ts
const { allowed, retryAfter } = checkRateLimit('auth');
```

```ts
const authData = localStorage.getItem('kemana.auth.userId');
...
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
```

- Impact: attackers can clear storage or bypass this entirely. This should not be relied on for credential stuffing or auth abuse defense.
- Fix:
  - Document this as a product-side throttle only.
  - Keep real abuse controls server-side or provider-side.

## Positive Findings

- No evidence of `dangerouslySetInnerHTML` or major DOM XSS sinks was found in the reviewed app code.
- No evidence of `eval`, `new Function`, or string-based timer execution was found.
- Download helpers already use `rel="noopener"` in the relevant anchor creation paths.
- Auth callback navigation is fixed-route oriented rather than accepting arbitrary redirect targets.

## Prioritized Security Roadmap

### Priority 0: keep the current static-export app safe enough to ship

- [ ] Document that `unsafe-inline` is a temporary compatibility tradeoff for the web static-export target.
- [ ] Stop describing local browser encryption as XSS protection.
- [ ] Add a small “security guardrails” check in CI for:
  - [ ] `dangerouslySetInnerHTML`
  - [ ] `innerHTML`
  - [ ] `outerHTML`
  - [ ] `insertAdjacentHTML`
  - [ ] `eval`
  - [ ] `new Function`
  - [ ] `javascript:` URLs

### Priority 1: audit XSS and rendering surfaces

- [ ] Review all import flows (JSON/CSV) and confirm imported text only reaches plain React text rendering.
- [ ] Review all URL-derived values (`location.search`, `location.hash`, router params) before they are used in navigation or auth logic.
- [ ] Add a documented rule: no raw HTML rendering without an approved sanitizer.
- [ ] If rich content is added later, introduce DOMPurify rather than extending regex sanitizers.

### Priority 2: browser storage, auth, and session handling

- [ ] Verify and document Supabase session persistence behavior for the web target.
- [ ] Minimize persisted Zustand/localStorage state further where possible.
- [ ] Separate low-sensitivity UX state from anything identity-related.
- [ ] Review auth callback and sign-in flows for logging, token handling, and failure behavior.

### Priority 3: split web vs Capacitor security posture

- [ ] Treat Capacitor/static export and web production as separate deployment/security targets.
- [ ] Keep the static/export target compatibility-oriented.
- [ ] Move the web target to a non-export Next deployment when feasible.
- [ ] Implement nonce-based CSP for the web target after that split.

## Recommended Immediate Actions

1. Update misleading security comments in:
   - `apps/web/src/store/use-kemana-store.ts`
   - `apps/web/src/lib/crypto.ts`
2. Add a repository-level guardrail check for dangerous DOM/XSS sinks.
3. Audit JSON/CSV import code next.
4. Decide whether the production web app will remain a static export or get its own deployment path.

## Follow-Up Artifacts

- Web threat model and storage/navigation audit:
  - `apps/web/WEB_SECURITY_THREAT_MODEL.md`

## Notes on Scope

- This report is evidence-based from the code visible in this repo.
- Runtime/infra protections that may exist outside the repo were not assumed unless directly visible in code/config.
- The current report is focused on the frontend/web target and browser-exposed threat model, not a full Supabase backend or infrastructure audit.
