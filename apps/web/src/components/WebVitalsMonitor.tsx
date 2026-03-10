"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * WebVitalsMonitor component
 * 
 * Tracks Core Web Vitals (LCP, CLS, INP, FCP, TTFB) and reports them to Sentry.
 * This helps monitor real-user performance and identify issues.
 * 
 * Note: web-vitals v5+ uses onCLS, onLCP, onINP, onFCP, onTTFB (FID removed, replaced by INP)
 */
export function WebVitalsMonitor() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    // Check if Sentry is available
    const sentry = Sentry.getClient();
    if (!sentry) {
      console.warn("[WebVitals] Sentry client not available");
      return;
    }

    // Handle web vitals from the web-vitals library
    const handleWebVitals = (metric: {
      name: string;
      value: number;
      id: string;
      rating: string;
      delta: number;
    }) => {
      // Report to Sentry as breadcrumb
      Sentry.addBreadcrumb({
        category: "web-vitals",
        message: `${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
        level: "info",
      });

      // Only send critical metrics to Sentry (poor rating)
      if (metric.rating === "poor") {
        Sentry.captureMessage(`Web Vital ${metric.name} is poor: ${metric.value}`, {
          level: "warning",
          extra: {
            metricId: metric.id,
            metricValue: metric.value,
            metricRating: metric.rating,
            metricDelta: metric.delta,
          },
          tags: {
            web_vital: metric.name.toLowerCase(),
            performance_rating: metric.rating,
          },
        });
      }

      console.log(`[WebVitals] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        delta: metric.delta,
      });
    };

    // Import web-vitals dynamically
    import("web-vitals").then((webVitals) => {
      // LCP - Largest Contentful Paint
      webVitals.onLCP(handleWebVitals);
      
      // CLS - Cumulative Layout Shift
      webVitals.onCLS(handleWebVitals);
      
      // INP - Interaction to Next Paint (replaces FID)
      webVitals.onINP(handleWebVitals);
      
      // FCP - First Contentful Paint
      webVitals.onFCP(handleWebVitals);
      
      // TTFB - Time to First Byte
      webVitals.onTTFB(handleWebVitals);
    }).catch((err) => {
      console.warn("[WebVitals] Failed to load web-vitals library:", err);
    });

    // Cleanup
    return () => {
      // web-vitals handles cleanup internally
    };
  }, []);

  // This component doesn't render anything
  return null;
}

export default WebVitalsMonitor;
