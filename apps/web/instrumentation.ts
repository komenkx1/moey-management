import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./sentry.config";

/**
 * Next.js 15 Instrumentation
 * 
 * This file is automatically loaded by Next.js during startup.
 * It runs in both Node.js and Edge runtimes.
 */

export async function register() {
  // Only initialize Sentry if DSN is configured
  if (!sentryConfig.dsn) {
    console.warn("[Sentry Server] DSN not configured. Skipping server-side initialization.");
    return;
  }

  // Determine runtime environment
  const runtime = process.env.NEXT_RUNTIME;

  if (runtime === "nodejs") {
    // Node.js runtime initialization
    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: sentryConfig.environment,
      release: sentryConfig.release,
      debug: sentryConfig.debug,
      sampleRate: sentryConfig.sampleRate,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      attachStacktrace: sentryConfig.attachStacktrace,
      ignoreErrors: sentryConfig.ignoreErrors,
      beforeSend(event) {
        if (process.env.NODE_ENV === "development" && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }
        return event;
      },
    });

    if (sentryConfig.debug) {
      console.log("[Sentry Server] Initialized for Node.js runtime");
    }
  } else if (runtime === "edge") {
    // Edge runtime initialization
    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: sentryConfig.environment,
      release: sentryConfig.release,
      debug: sentryConfig.debug,
      sampleRate: sentryConfig.sampleRate,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      attachStacktrace: sentryConfig.attachStacktrace,
      ignoreErrors: sentryConfig.ignoreErrors,
      beforeSend(event) {
        if (process.env.NODE_ENV === "development" && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }
        return event;
      },
    });

    if (sentryConfig.debug) {
      console.log("[Sentry Server] Initialized for Edge runtime");
    }
  }
}

/**
 * onRequestError is called when an error occurs during a request.
 */
export const onRequestError = Sentry.captureRequestError;
