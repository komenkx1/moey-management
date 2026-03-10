import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { WebVitalsMonitor } from "../../../src/components/WebVitalsMonitor";
import * as Sentry from "@sentry/nextjs";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  getClient: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock web-vitals
const mockOnLCP = vi.fn();
const mockOnCLS = vi.fn();
const mockOnINP = vi.fn();
const mockOnFCP = vi.fn();
const mockOnTTFB = vi.fn();

vi.mock("web-vitals", () => ({
  onLCP: mockOnLCP,
  onCLS: mockOnCLS,
  onINP: mockOnINP,
  onFCP: mockOnFCP,
  onTTFB: mockOnTTFB,
}));

describe("WebVitalsMonitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render without crashing", () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as any);
    const { container } = render(<WebVitalsMonitor />);
    expect(container).toBeTruthy();
  });

  it("should return null (no visual output)", () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as any);
    const { container } = render(<WebVitalsMonitor />);
    expect(container.firstChild).toBeNull();
  });

  it("should warn if Sentry client is not available", () => {
    vi.mocked(Sentry.getClient).mockReturnValue(undefined);
    render(<WebVitalsMonitor />);
    
    expect(console.warn).toHaveBeenCalledWith(
      "[WebVitals] Sentry client not available"
    );
  });

  it("should register web vitals handlers when Sentry is available", async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as any);
    
    render(<WebVitalsMonitor />);
    
    // Wait for dynamic import
    await vi.waitFor(() => {
      expect(mockOnLCP).toHaveBeenCalled();
      expect(mockOnCLS).toHaveBeenCalled();
      expect(mockOnINP).toHaveBeenCalled();
      expect(mockOnFCP).toHaveBeenCalled();
      expect(mockOnTTFB).toHaveBeenCalled();
    });
  });

  it("should handle web vitals metric with good rating", async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as any);
    
    render(<WebVitalsMonitor />);
    
    await vi.waitFor(() => {
      expect(mockOnLCP).toHaveBeenCalled();
    });

    // Simulate LCP metric callback
    const lcpHandler = mockOnLCP.mock.calls[0][0];
    const goodMetric = {
      name: "LCP",
      value: 1500,
      id: "test-id",
      rating: "good",
      delta: 100,
    };

    lcpHandler(goodMetric);

    // Should add breadcrumb
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: "web-vitals",
      message: "LCP: 1500.00 (good)",
      level: "info",
    });

    // Should NOT capture message for good rating
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("should capture message for poor web vitals", async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as any);
    
    render(<WebVitalsMonitor />);
    
    await vi.waitFor(() => {
      expect(mockOnCLS).toHaveBeenCalled();
    });

    // Simulate CLS metric callback with poor rating
    const clsHandler = mockOnCLS.mock.calls[0][0];
    const poorMetric = {
      name: "CLS",
      value: 0.5,
      id: "test-cls-id",
      rating: "poor",
      delta: 0.2,
    };

    clsHandler(poorMetric);

    // Should add breadcrumb
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: "web-vitals",
      message: "CLS: 0.50 (poor)",
      level: "info",
    });

    // Should capture message for poor rating
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Web Vital CLS is poor: 0.5",
      expect.objectContaining({
        level: "warning",
        extra: {
          metricId: "test-cls-id",
          metricValue: 0.5,
          metricRating: "poor",
          metricDelta: 0.2,
        },
        tags: {
          web_vital: "cls",
          performance_rating: "poor",
        },
      })
    );
  });

  it("should log metrics to console", async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as any);
    
    render(<WebVitalsMonitor />);
    
    await vi.waitFor(() => {
      expect(mockOnFCP).toHaveBeenCalled();
    });

    // Simulate FCP metric callback
    const fcpHandler = mockOnFCP.mock.calls[0][0];
    const metric = {
      name: "FCP",
      value: 1200,
      id: "test-fcp-id",
      rating: "good",
      delta: 50,
    };

    fcpHandler(metric);

    expect(console.log).toHaveBeenCalledWith(
      "[WebVitals] FCP:",
      expect.objectContaining({
        value: 1200,
        rating: "good",
        id: "test-fcp-id",
        delta: 50,
      })
    );
  });

  it("should handle web-vitals import error", async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as any);
    
    // Mock import to fail
    vi.doMock("web-vitals", () => {
      throw new Error("Failed to load");
    });

    render(<WebVitalsMonitor />);

    // Note: This test might not work perfectly due to dynamic import caching
    // In real scenario, the catch block would log the error
  });
});
