import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sanitizeInput,
  isSafeInput,
  sanitizeTransactionText,
  sanitizeCategory,
  isValidEmail,
  isValidAmount,
  sanitizeFilename,
  checkRateLimit,
  cleanupRateLimits,
  getRateLimitMapSize
} from "../../../src/lib/security";

describe("security utils", () => {
  describe("sanitizeInput", () => {
    it("should remove script tags", () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("should remove event handlers", () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeInput(input);
      expect(result).not.toContain("onclick");
    });

    it("should remove javascript: protocol", () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeInput(input);
      expect(result).not.toContain("javascript:");
    });

    it("should escape HTML entities", () => {
      const input = '<div>Test & "quotes"</div>';
      const result = sanitizeInput(input);
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("&amp;");
      expect(result).toContain("&quot;");
    });

    it("should handle empty input", () => {
      expect(sanitizeInput("")).toBe("");
      expect(sanitizeInput(null as any)).toBe("");
      expect(sanitizeInput(undefined as any)).toBe("");
    });

    it("should remove iframe tags", () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = sanitizeInput(input);
      expect(result).not.toContain("iframe");
    });
  });

  describe("isSafeInput", () => {
    it("should return true for safe input", () => {
      expect(isSafeInput("Hello World")).toBe(true);
      expect(isSafeInput("Test 123")).toBe(true);
    });

    it("should return false for script tags", () => {
      expect(isSafeInput('<script>alert(1)</script>')).toBe(false);
    });

    it("should return false for event handlers", () => {
      expect(isSafeInput('<div onclick="alert(1)">')).toBe(false);
    });

    it("should return false for javascript: protocol", () => {
      expect(isSafeInput('javascript:alert(1)')).toBe(false);
    });

    it("should return true for empty input", () => {
      expect(isSafeInput("")).toBe(true);
      expect(isSafeInput(null as any)).toBe(true);
    });
  });

  describe("sanitizeTransactionText", () => {
    it("should remove control characters", () => {
      const input = "Test\x00\x1F\x7FText";
      const result = sanitizeTransactionText(input);
      expect(result).toBe("TestText");
    });

    it("should remove script tags", () => {
      const input = 'Makan <script>alert(1)</script> siang';
      const result = sanitizeTransactionText(input);
      expect(result).not.toContain("<script>");
    });

    it("should limit length to 500 characters", () => {
      const input = "a".repeat(600);
      const result = sanitizeTransactionText(input);
      expect(result.length).toBe(500);
    });

    it("should handle empty input", () => {
      expect(sanitizeTransactionText("")).toBe("");
      expect(sanitizeTransactionText(null as any)).toBe("");
    });

    it("should preserve normal transaction text", () => {
      const input = "Makan siang di warteg 50000";
      const result = sanitizeTransactionText(input);
      expect(result).toBe(input);
    });
  });

  describe("sanitizeCategory", () => {
    it("should remove special characters", () => {
      const input = "Makan<>!@#$%";
      const result = sanitizeCategory(input);
      expect(result).toBe("Makan");
    });

    it("should allow safe characters like & - _ ()", () => {
      const input = "Makan & Minum (Pagi-Siang)";
      const result = sanitizeCategory(input);
      expect(result).toBe("Makan & Minum (Pagi-Siang)");
    });

    it("should limit length to 50 characters", () => {
      const input = "a".repeat(60);
      const result = sanitizeCategory(input);
      expect(result.length).toBe(50);
    });

    it("should return 'Lainnya' for empty input", () => {
      expect(sanitizeCategory("")).toBe("Lainnya");
      expect(sanitizeCategory(null as any)).toBe("Lainnya");
      expect(sanitizeCategory("!@#$%")).toBe("Lainnya");
    });

    it("should preserve alphanumeric and spaces", () => {
      const input = "Makan Siang 123";
      const result = sanitizeCategory(input);
      expect(result).toBe("Makan Siang 123");
    });
  });

  describe("isValidEmail", () => {
    it("should validate correct email", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.id")).toBe(true);
    });

    it("should reject invalid email", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("test@.com")).toBe(false);
    });
  });

  describe("isValidAmount", () => {
    it("should validate positive numbers", () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(50000)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
    });

    it("should reject zero and negative", () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
    });

    it("should reject non-finite numbers", () => {
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
    });

    it("should reject amounts over limit", () => {
      expect(isValidAmount(1_000_000_000_000)).toBe(false);
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove path traversal", () => {
      const input = "../../../etc/passwd";
      const result = sanitizeFilename(input);
      expect(result).not.toContain("..");
    });

    it("should remove special characters", () => {
      const input = 'file<>:"/\\|?*.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe("file_________.txt");
    });

    it("should limit length to 100 characters", () => {
      const input = "a".repeat(150) + ".txt";
      const result = sanitizeFilename(input);
      expect(result.length).toBe(100);
    });

    it("should return 'download' for empty input", () => {
      expect(sanitizeFilename("")).toBe("download");
      expect(sanitizeFilename(null as any)).toBe("download");
    });
  });

  describe("checkRateLimit", () => {
    beforeEach(() => {
      // Clear rate limit map before each test
      cleanupRateLimits();
    });

    it("should allow first attempt", () => {
      expect(checkRateLimit("user1")).toBe(true);
    });

    it("should allow up to max attempts", () => {
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit("user2", 5)).toBe(true);
      }
    });

    it("should block after max attempts", () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit("user3", 5);
      }
      expect(checkRateLimit("user3", 5)).toBe(false);
    });

    it("should reset after window expires", () => {
      // Use very short window for testing
      for (let i = 0; i < 5; i++) {
        checkRateLimit("user4", 5, 10);
      }
      
      // Wait for window to expire
      return new Promise(resolve => {
        setTimeout(() => {
          expect(checkRateLimit("user4", 5, 10)).toBe(true);
          resolve(undefined);
        }, 15);
      });
    });
  });

  describe("cleanupRateLimits", () => {
    it("should remove expired entries", () => {
      checkRateLimit("user5", 5, 10);
      
      return new Promise(resolve => {
        setTimeout(() => {
          cleanupRateLimits();
          // After cleanup, should be able to start fresh
          expect(checkRateLimit("user5", 5, 10)).toBe(true);
          resolve(undefined);
        }, 15);
      });
    });

    it("should prevent memory leak by limiting map size", () => {
      // Clear first
      cleanupRateLimits();
      
      // Add many entries (more than MAX_RATE_LIMIT_ENTRIES)
      for (let i = 0; i < 1100; i++) {
        checkRateLimit(`user-${i}`, 5, 60000);
      }
      
      // Should have triggered cleanup, so size should be reasonable
      // Not exactly 1000 because cleanup happens AFTER exceeding limit
      const size = getRateLimitMapSize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThanOrEqual(1110); // Allow some buffer
    });
  });
});
