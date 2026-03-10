// Sentry configuration for KeMana Web
// This file contains shared configuration for client and server

export const sentryConfig = {
  // DSN is set via environment variable NEXT_PUBLIC_SENTRY_DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",

  // Release version (uses app version from package.json)
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Enable debug mode only when explicitly set
  debug: process.env.SENTRY_DEBUG === "true",

  // Sample rate for error events (1.0 = 100%)
  sampleRate: 1.0,

  // Sample rate for tracing/performance monitoring (0.1 = 10%)
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),

  // Sample rate for session replays (0.1 = 10% of sessions)
  replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || "0.1"),

  // Sample rate for error-triggered replays (1.0 = 100% of errors)
  replaysOnErrorSampleRate: parseFloat(process.env.SENTRY_REPLAYS_ERROR_SAMPLE_RATE || "1.0"),

  // Enable source maps
  attachStacktrace: true,

  // Ignore certain errors
  ignoreErrors: [
    // Network errors
    "Network Error",
    "Failed to fetch",
    "Network request failed",
    // Common browser extensions errors
    "chrome-extension",
    "moz-extension",
    "webkit-masked-url",
    // ResizeObserver loop errors (common in React)
    "ResizeObserver loop",
    // Supabase auth errors that are handled
    "AuthSessionMissingError",
    "AuthRetryableFetchError",
  ],

  // Deny URLs from extensions
  denyUrls: [
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
  ],
};

// Export the config for use in instrumentation
export default sentryConfig;
