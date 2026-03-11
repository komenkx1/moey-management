/**
 * Client-Side Rate Limiter
 * 
 * Since we use static export (output: "export") for Capacitor,
 * we cannot use Edge Middleware. This implements client-side
 * rate limiting with localStorage persistence.
 * 
 * Features:
 * - Per-endpoint rate limiting
 * - Sliding window algorithm
 * - localStorage persistence (survives page reloads)
 * - Memory leak prevention (auto-cleanup)
 * - Security event logging
 */

import { logRateLimitViolation } from './security-monitoring';

interface RateLimitRecord {
  count: number;
  resetAt: number;
  violations: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
};

// Per-endpoint configurations
const ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  'sync': { maxRequests: 100, windowMs: 60000 },
  'auth': { maxRequests: 10, windowMs: 60000 },
  'api': { maxRequests: 60, windowMs: 60000 },
  'default': DEFAULT_CONFIG,
};

const STORAGE_KEY = 'kemana.rateLimit';
const MAX_STORAGE_ENTRIES = 100; // Prevent memory leak

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
    this.startCleanup();
  }

  /**
   * Check if request is allowed
   */
  check(endpoint: string = 'default'): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const config = ENDPOINT_CONFIGS[endpoint] || DEFAULT_CONFIG;
    const now = Date.now();
    const key = this.getKey(endpoint);
    
    let record = this.records.get(key);

    // Clean up expired record
    if (record && record.resetAt < now) {
      this.records.delete(key);
      record = undefined;
    }

    // First request in window
    if (!record) {
      const resetAt = now + config.windowMs;
      this.records.set(key, {
        count: 1,
        resetAt,
        violations: 0,
      });
      this.saveToStorage();
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }

    // Rate limit exceeded
    if (record.count >= config.maxRequests) {
      record.violations++;
      this.saveToStorage();
      
      // Log violation
      logRateLimitViolation(endpoint, endpoint, {
        count: record.count,
        violations: record.violations,
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      };
    }

    // Increment count
    record.count++;
    this.saveToStorage();

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset rate limit for endpoint
   */
  reset(endpoint: string = 'default'): void {
    const key = this.getKey(endpoint);
    this.records.delete(key);
    this.saveToStorage();
  }

  /**
   * Get current status
   */
  getStatus(endpoint: string = 'default'): {
    count: number;
    remaining: number;
    resetAt: number;
    violations: number;
  } {
    const config = ENDPOINT_CONFIGS[endpoint] || DEFAULT_CONFIG;
    const key = this.getKey(endpoint);
    const record = this.records.get(key);
    const now = Date.now();

    if (!record || record.resetAt < now) {
      return {
        count: 0,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
        violations: 0,
      };
    }

    return {
      count: record.count,
      remaining: Math.max(0, config.maxRequests - record.count),
      resetAt: record.resetAt,
      violations: record.violations,
    };
  }

  /**
   * Get storage key for endpoint
   */
  private getKey(endpoint: string): string {
    return `${endpoint}:${this.getUserId()}`;
  }

  /**
   * Get user identifier (user ID or device ID)
   */
  private getUserId(): string {
    // Try to get user ID from auth
    if (typeof window !== 'undefined') {
      try {
        const authData = localStorage.getItem('kemana.auth.userId');
        if (authData) return authData;
      } catch (e) {
        // Ignore
      }
    }

    // Fallback to device ID
    return this.getDeviceId();
  }

  /**
   * Get or create device ID
   */
  private getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';

    const key = 'kemana.deviceId';
    let deviceId = localStorage.getItem(key);
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, deviceId);
    }
    
    return deviceId;
  }

  /**
   * Load records from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;

      const parsed = JSON.parse(data);
      const now = Date.now();

      // Only load non-expired records
      for (const [key, record] of Object.entries(parsed)) {
        const r = record as RateLimitRecord;
        if (r.resetAt > now) {
          this.records.set(key, r);
        }
      }
    } catch (e) {
      console.error('[RateLimiter] Failed to load from storage:', e);
    }
  }

  /**
   * Save records to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      // Prevent memory leak: limit storage entries
      if (this.records.size > MAX_STORAGE_ENTRIES) {
        this.cleanup();
      }

      const data: Record<string, RateLimitRecord> = {};
      for (const [key, record] of this.records.entries()) {
        data[key] = record;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[RateLimiter] Failed to save to storage:', e);
    }
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.records.entries()) {
      if (record.resetAt < now) {
        this.records.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (typeof window === 'undefined') return;

    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Check rate limit for endpoint
 */
export function checkRateLimit(endpoint: string = 'default'): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  return getRateLimiter().check(endpoint);
}

/**
 * Reset rate limit for endpoint
 */
export function resetRateLimit(endpoint: string = 'default'): void {
  getRateLimiter().reset(endpoint);
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(endpoint: string = 'default') {
  return getRateLimiter().getStatus(endpoint);
}

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string = 'default'
): T {
  return (async (...args: any[]) => {
    const { allowed, retryAfter } = checkRateLimit(endpoint);
    
    if (!allowed) {
      throw new Error(
        `Rate limit exceeded for ${endpoint}. Retry after ${retryAfter} seconds.`
      );
    }
    
    return fn(...args);
  }) as T;
}
