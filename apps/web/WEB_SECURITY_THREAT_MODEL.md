# Web Security Threat Model

This document captures the current browser-facing security posture for KeMana's current `web-static-export` target. It is meant to be updated when storage keys, auth flows, redirect behavior, or import surfaces change.

## Target Naming

- `web-static-export`
  The current browser deployment produced by `output: "export"`. This is also the bundle consumed by Capacitor.
- `native-capacitor`
  Android/iOS shells that load the `web-static-export` artifact.
- `web-server`
  A future non-export browser deployment target if stronger CSP/auth controls are needed.

This document is about `web-static-export`, not a future `web-server` design.

## Current Deployment Posture

- `web-static-export` and `native-capacitor` currently share the same `Next.js` app.
- The app uses `output: "export"` because the current exported bundle must serve both the browser deploy and Capacitor.
- Because of that export model, production CSP for `web-static-export` is currently compatibility-oriented and allows:
  - `script-src 'self' 'unsafe-inline'`
  - `style-src 'self' 'unsafe-inline'`
- This means CSP is not the primary XSS boundary for the current `web-static-export` deployment. Safe rendering and sink avoidance are more important.
- A future `web-server` target should not inherit this CSP tradeoff by default.

## Auth Persistence

- Auth is handled by the browser Supabase client in [supabase.ts](./src/lib/supabase.ts).
- Session state is read in [useAuth.ts](./src/hooks/useAuth.ts) via:
  - `supabase.auth.getSession()`
  - `supabase.auth.onAuthStateChange(...)`
- OAuth redirects use a fixed internal callback path:
  - `AUTH_CALLBACK_PATH = "/auth/callback"`
  - `buildAuthCallbackUrl(window.location.origin)`
- The callback screen redirects only to the app home route:
  - `APP_HOME_PATH = "/"`

Threat model implications:

- Browser-resident auth/session material should be treated as sensitive.
- A successful XSS in `web-static-export` would be materially valuable because the app is SPA-style and auth is client-managed.
- Fixed callback and home redirects reduce open-redirect style risk, but they do not mitigate XSS.

## Browser Storage Inventory

### Keep

- `kemana.ui.zustand.v1`
  - Purpose: persisted low-sensitivity UI state
  - Location: [use-kemana-store.ts](./src/store/use-kemana-store.ts)
  - Notes: stored with deterministic client-side obfuscation only; do not add secrets
- `kemana.lastOpenAt`
  - Purpose: recall / habit timing
  - Location: [useStorageInit.ts](./src/hooks/useStorageInit.ts)
- `kemana.dismissedRecallUntil`
  - Purpose: session-scoped recall dismissal
  - Location: [useStorageInit.ts](./src/hooks/useStorageInit.ts), [page.tsx](./src/app/page.tsx)
- `kemana.themeMode`
  - Purpose: theme preference
  - Location: [dashboard-page-helpers.ts](./src/lib/dashboard-page-helpers.ts)
- `kemana.userName`
  - Purpose: profile display name
  - Location: [page.tsx](./src/app/page.tsx)
- `kemana.updateBanner.dismissedSession.v1`
  - Purpose: hide update banner for current session
  - Location: [sw-register.tsx](./src/app/sw-register.tsx)
- `kemana.updateApplied.v1`
  - Purpose: one-shot UX marker after service worker update
  - Location: [sw-register.tsx](./src/app/sw-register.tsx)
- `pwa_install_banner_seen_v1`
  - Purpose: suppress repeat install prompt
  - Location: [PwaInstallBanner.tsx](./src/components/PwaInstallBanner.tsx)
- `kemana.lastSync.{userId}`
  - Purpose: delta-sync cursor
  - Location: [packages/storage/sync.ts](../packages/storage/sync.ts)
  - Notes: safe to keep, but should be cleared on hard logout or DB wipe
- `kemana.rateLimit`
  - Purpose: UX-only client throttle
  - Location: [rate-limiter.ts](./src/lib/rate-limiter.ts)
  - Notes: not a security boundary

### Sensitive But Currently Needed

- `kemana.auth.userId`
  - Purpose: stable browser-readable identity marker used by persisted UI-state obfuscation and rate-limit bucketing
  - Location: [use-auth-store.ts](./src/store/use-auth-store.ts)
  - Notes: this is metadata, not a secret; remove if the UI-state obfuscation layer is removed later

### Removal Candidates

- `DEBUG_PERF`
  - Purpose: local perf debugging toggle
  - Location: [perf.ts](./src/lib/perf.ts)
  - Recommendation: keep for internal/dev only, avoid relying on it in production workflows
- `kemana.perf.quickAddAck.v1`
  - Purpose: local performance sample cache
  - Location: [perf.ts](./src/lib/perf.ts)
  - Recommendation: remove if performance acknowledgements are no longer actively used
- `kemana.deviceId`
  - Purpose: fallback rate-limit bucketing for anonymous users
  - Location: [rate-limiter.ts](./src/lib/rate-limiter.ts)
  - Recommendation: acceptable for now; remove if server-side abuse controls replace the browser-side limiter

## Navigation And Redirect Audit

Reviewed browser navigation writes:

- [auth/callback/page.tsx](./src/app/auth/callback/page.tsx)
  - `router.push(APP_HOME_PATH)`
  - `window.location.href = APP_HOME_PATH`
  - Assessment: safe, fixed internal-only navigation
- [useAuth.ts](./src/hooks/useAuth.ts)
  - `redirectTo: buildAuthCallbackUrl(window.location.origin)`
  - Assessment: safe, same-origin callback URL with fixed path
- [sw-register.tsx](./src/app/sw-register.tsx)
  - `window.location.reload()`
  - Assessment: safe page refresh, not a user-controlled redirect
- [ErrorBoundary.tsx](./src/components/ErrorBoundary.tsx)
  - `window.location.reload()`
  - Assessment: safe page refresh, not a user-controlled redirect
- [safe-area-sync.tsx](./src/app/safe-area-sync.tsx)
  - Reads `window.location.search`
  - Assessment: debug-flag read only, no redirect sink

Current conclusion:

- No open redirect path was found in the reviewed web code.
- Navigation writes are currently fixed-route and same-origin.
- Future dynamic redirects should go through a reviewed helper instead of directly calling `router.push` or assigning to `location`.

## Import Surface Rules

- Treat JSON backup files and CSV files as untrusted input.
- Import must reject:
  - oversized files
  - malformed dates/timestamps
  - invalid IDs
  - empty or control-character-only text
  - unreasonable split payloads
- Imported text should continue to render through plain React text nodes only.

## Guardrail Rules

The repository-level security check currently blocks:

- `dangerouslySetInnerHTML`
- `innerHTML` / `outerHTML`
- `insertAdjacentHTML`
- `document.write`
- `eval`
- `new Function`
- string-based `setTimeout` / `setInterval`
- `window.open`
- `postMessage(..., "*")`
- dynamic `router.push` / `router.replace`
- dynamic `location` assignments

Exceptions must be explicit and reviewed in code.
