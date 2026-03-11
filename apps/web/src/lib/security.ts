import { logXSSAttempt, logSQLInjectionAttempt } from './security-monitoring';

/**
 * Security utilities for input sanitization and validation
 * Protects against XSS and other injection attacks
 * 
 * Security Features:
 * - XSS prevention (HTML sanitization)
 * - SQL injection detection
 * - Input validation
 * - Rate limiting with memory leak prevention
 * - Attack detection and logging
 */

// Regex patterns for detecting XSS attempts
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick, onload, etc
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /data:text\/html/gi,
];

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes script tags, event handlers, and other dangerous content
 * 
 * IMPORTANT: This escapes HTML entities. Use this for display only.
 * For storage, consider using sanitizeTransactionText() instead.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Detect XSS attempts and log them
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      logXSSAttempt(input, { function: 'sanitizeInput' });
      break; // Only log once per input
    }
  }

  let sanitized = input;

  // Remove script tags and their content (including unclosed tags)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, "");
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, "");
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["']?[^"']*["']?/gi, "");
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");
  
  // Remove data:text/html
  sanitized = sanitized.replace(/data:text\/html[^,]*/gi, "");
  
  // Remove iframe, object, embed tags (including unclosed)
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^>]*>/gi, "");
  sanitized = sanitized.replace(/<\/(iframe|object|embed)\s*>/gi, "");
  
  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return sanitized.trim();
}

/**
 * Validates if input contains potential XSS patterns
 * Returns true if input is safe, false if suspicious
 */
export function isSafeInput(input: string): boolean {
  if (!input || typeof input !== "string") {
    return true;
  }

  return !XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitizes transaction text input
 * Preserves allowed characters for transaction parsing
 */
export function sanitizeTransactionText(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  // Remove control characters
  let sanitized = text.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  
  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, "");
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["']?[^"']*["']?/gi, "");
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");
  
  // Limit length
  const MAX_LENGTH = 500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized.trim();
}

/**
 * Sanitizes category name
 * Allows alphanumeric, spaces, and common safe characters
 */
export function sanitizeCategory(category: string): string {
  if (!category || typeof category !== "string") {
    return "Lainnya";
  }

  // Remove dangerous characters, keep alphanumeric, spaces, and safe punctuation
  let sanitized = category.replace(/[^a-zA-Z0-9\s&\-_()]/g, "");
  
  // Limit length
  const MAX_LENGTH = 50;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized.trim() || "Lainnya";
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates amount is a positive number
 */
export function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= 999_999_999_999;
}

/**
 * Sanitizes filename for download/export
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "download";
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, "");
  
  // Remove special characters
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, "_");
  
  // Limit length
  const MAX_LENGTH = 100;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized.trim() || "download";
}

/**
 * Rate limiting helper for auth attempts
 * Simple in-memory rate limiter with automatic cleanup
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_RATE_LIMIT_ENTRIES = 1000; // Prevent memory leak

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Cleanup if map is getting too large
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    cleanupRateLimits();
  }

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clears expired rate limit entries
 * Should be called periodically
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Get current rate limit map size (for testing/monitoring)
 */
export function getRateLimitMapSize(): number {
  return rateLimitMap.size;
}

// Cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}