"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "../../sentry.config";

// Track if Sentry has been initialized
let isSentryInitialized = false;

/**
 * SentryInit component
 * 
 * Initializes Sentry on the client side. This should be mounted early in the app lifecycle,
 * typically in the root layout. Uses a singleton pattern to prevent double initialization.
 */
export function SentryInit() {
  useEffect(() => {
    // Skip if already initialized or if DSN is not set
    if (isSentryInitialized || !sentryConfig.dsn) {
      if (!sentryConfig.dsn && process.env.NODE_ENV === "development") {
        console.warn("[Sentry] DSN not configured. Skipping initialization.");
      }
      return;
    }

    // Initialize Sentry
    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: sentryConfig.environment,
      release: sentryConfig.release,
      debug: sentryConfig.debug,
      sampleRate: sentryConfig.sampleRate,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      replaysSessionSampleRate: sentryConfig.replaysSessionSampleRate,
      replaysOnErrorSampleRate: sentryConfig.replaysOnErrorSampleRate,
      attachStacktrace: sentryConfig.attachStacktrace,
      ignoreErrors: sentryConfig.ignoreErrors,
      denyUrls: sentryConfig.denyUrls,
      // BeforeSend: Don't send events in development unless explicitly enabled
      beforeSend(event) {
        if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV !== "true") {
          console.log("[Sentry] Event captured (dev mode - not sent):", event);
          return null;
        }
        return event;
      },
    });

    isSentryInitialized = true;

    if (sentryConfig.debug) {
      console.log("[Sentry] Initialized successfully", {
        environment: sentryConfig.environment,
        release: sentryConfig.release,
        tracesSampleRate: sentryConfig.tracesSampleRate,
      });
    }
  }, []);

  // This component doesn't render anything
  return null;
}

export default SentryInit;
