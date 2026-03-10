# Sentry Integration Guide for KeMana Web

This guide explains how to use the Sentry error tracking and performance monitoring system integrated into KeMana Web.

## Overview

Sentry provides:
- **Error Tracking**: Capture and track JavaScript errors in real-time
- **Performance Monitoring**: Track app performance with distributed tracing
- **Session Replay**: Record and replay user sessions to debug issues
- **Release Tracking**: Associate errors with specific app versions

## Quick Start

### 1. Environment Configuration

Copy the example environment file and configure your Sentry DSN:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Sentry DSN:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123@example.ingest.sentry.io/1234567
```

### 2. Enable Sentry in Development (for testing)

By default, Sentry doesn't send events in development. To test locally:

```bash
# In .env.local
# MUST use NEXT_PUBLIC_ prefix for client-side access
NEXT_PUBLIC_SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

**Important**: Environment variables di Next.js client-side harus pakai prefix `NEXT_PUBLIC_`. `SENTRY_ENABLE_DEV` saja tidak akan berfungsi di browser.

### 3. Verify Installation

Run the development server:

```bash
npm run dev
```

Check browser console (F12 → Console), you should see:
```
[Sentry] Initialized successfully {environment: "development", release: "2.1.0", tracesSampleRate: 0.1}
```

### 4. Test Sentry with Test Page

A test page is included at `/test-sentry`. Open:

```
http://localhost:3005/test-sentry
```

Click the test buttons to verify:
- ✅ **Check Sentry Status** - Confirms Sentry is initialized
- ✅ **Test Capture Exception** - Sends test error to Sentry
- ✅ **Test Capture Message** - Sends test message
- ✅ **Test Breadcrumbs** - Adds debugging breadcrumbs
- ✅ **Test Performance Tracking** - Tests performance monitoring
- ✅ **Test Error Boundary** - Tests React error boundary integration

Then check your Sentry dashboard → Issues to see the captured events.

### 5. Test Error Reporting Manually

Add this to any component for quick testing:

```tsx
import { captureException } from "@/lib/sentry";

<button onClick={() => captureException(new Error("Test error"))}>
  Test Sentry
</button>
```

Or throw an error to test the ErrorBoundary:

```tsx
<button onClick={() => { throw new Error("Test error"); }}>
  Test Error Boundary
</button>
```

### 6. Check Sentry Dashboard

Go to your Sentry project dashboard:
1. **Issues** - Should see your test errors
2. **Performance** - Should see transactions (if tracesSampleRate > 0)
3. **Replays** - Should see session replays (if replaysSessionSampleRate > 0)

**Note**: Events may take 30-60 seconds to appear in the dashboard.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | - | Your Sentry project DSN |
| `SENTRY_ENVIRONMENT` | No | `NODE_ENV` | Environment name |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | Performance trace sampling (0.0-1.0) |
| `SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | No | `0.1` | Session replay sampling |
| `SENTRY_REPLAYS_ERROR_SAMPLE_RATE` | No | `1.0` | Error replay sampling |
| `NEXT_PUBLIC_SENTRY_ENABLE_DEV` | No | `false` | Enable in development (must use NEXT_PUBLIC_ prefix) |

### Source Maps (Production)

For production builds with source maps:

```bash
# Build with source maps
npm run build

# Upload source maps to Sentry (requires auth token)
SENTRY_AUTH_TOKEN=your-token npm run build
```

Required variables for source maps:
- `SENTRY_AUTH_TOKEN` - From Sentry API settings
- `SENTRY_ORG` - Your Sentry organization slug
- `SENTRY_PROJECT` - Your Sentry project slug

## Usage

### Automatic Error Capture

The following are automatically captured:
- React component errors (via ErrorBoundary)
- Unhandled JavaScript exceptions
- Unhandled Promise rejections
- API route errors (server-side)
- Performance transactions (10% sampling)

### Manual Error Reporting

Use the utility functions in `@/lib/sentry`:

```tsx
import { 
  captureException, 
  captureMessage, 
  addBreadcrumb,
  setUser,
  withPerformanceTracking 
} from "@/lib/sentry";

// Capture an exception
try {
  await riskyOperation();
} catch (error) {
  captureException(error, { context: "payment", amount: 50000 });
}

// Add breadcrumb for debugging trail
addBreadcrumb("User opened settings", "navigation");

// Set user context
setUser({ id: "123", email: "user@example.com" });

// Track performance
const result = await withPerformanceTracking("fetch_data", () => 
  fetchLargeDataset()
);
```

### React Error Boundary

The app includes a Sentry-aware ErrorBoundary. Errors caught here are automatically reported to Sentry with:
- Component stack trace
- Error details
- User feedback dialog

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

### Performance Monitoring

Transactions are automatically created for:
- Page navigation
- API requests
- Component renders (sampled)

Custom transactions:

```tsx
import * as Sentry from "@sentry/nextjs";

await Sentry.startSpan({ name: "process_data", op: "data.processing" }, async () => {
  // Your code here
  await processData();
});
```

### Session Replay

Session replay is enabled with privacy protections:
- All input fields are masked
- Media (images, videos) are blocked
- Text content is visible but can be masked with `data-sentry-mask`

```tsx
// Mask sensitive elements
<input data-sentry-mask type="password" />
<div data-sentry-mask>Sensitive information</div>
```

## Troubleshooting

### Sentry Not Initializing

1. Check DSN is set in `.env.local`
2. Verify `NEXT_PUBLIC_` prefix on DSN variable
3. Check browser console for initialization messages

### No Errors Appearing in Sentry

1. Check environment - errors only sent in production by default
2. Set `NEXT_PUBLIC_SENTRY_ENABLE_DEV=true` to test in development (must use NEXT_PUBLIC_ prefix for client-side)
3. Verify DSN is correct
4. Check ignore list in `sentry.config.ts`

**Important**: `SENTRY_ENABLE_DEV` (without NEXT_PUBLIC_) won't work in browser because Next.js only exposes env vars with NEXT_PUBLIC_ prefix to client-side code.

### Source Maps Not Working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings
3. Ensure builds are done in production mode
4. Check Sentry dashboard > Project Settings > Source Maps

### Performance Issues

Reduce sampling rates in `.env.local`:

```bash
SENTRY_TRACES_SAMPLE_RATE=0.05  # 5% of transactions
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.05  # 5% of sessions
```

## Best Practices

### 1. Always Use Utility Functions

```tsx
// Good
import { captureException } from "@/lib/sentry";
captureException(error);

// Avoid
import * as Sentry from "@sentry/nextjs";
Sentry.captureException(error);
```

### 2. Add Context to Errors

```tsx
captureException(error, { 
  transactionId, 
  userAction: "submit_payment" 
});
```

### 3. Use Breadcrumbs for User Flows

```tsx
addBreadcrumb("Started checkout", "checkout", { cartId });
addBreadcrumb("Applied coupon", "checkout", { couponCode });
addBreadcrumb("Payment failed", "checkout", { errorCode });
```

### 4. Clear User on Logout

```tsx
import { clearUser } from "@/lib/sentry";

function logout() {
  clearUser();
  // ... rest of logout
}
```

### 5. Don't Capture Expected Errors

```tsx
// Avoid capturing user input errors
try {
  validateInput(value);
} catch (error) {
  if (error instanceof ValidationError) {
    // Don't report - show to user instead
    showValidationError(error.message);
  } else {
    // Do report unexpected errors
    captureException(error);
  }
}
```

## Privacy & Security

### PII Handling

Sentry is configured to:
- Mask all input fields in session replay
- Block all media elements
- Not capture request/response bodies

Additional precautions:
- Never log passwords or tokens
- Use `data-sentry-mask` on sensitive elements
- Review events in Sentry dashboard regularly

### Data Retention

Configure in Sentry dashboard:
- Project Settings > Inbound Filters
- Project Settings > Data Scrubbing

## Resources

- [Sentry Next.js SDK Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay Privacy](https://docs.sentry.io/platforms/javascript/session-replay/privacy/)
- [KeMana Sentry Config](./sentry.config.ts)
- [KeMana Sentry Utils](./src/lib/sentry.ts)
