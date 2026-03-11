/**
 * Security Monitoring Utilities
 * 
 * Centralized logging for security events with Sentry integration.
 * All security-related events should be logged through these functions.
 */

export type SecurityEventType =
  | 'rate_limit_exceeded'
  | 'invalid_auth_token'
  | 'unauthorized_access'
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'csrf_attempt'
  | 'suspicious_activity'
  | 'data_breach_attempt'
  | 'brute_force_attempt';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

interface SecurityEventMetadata {
  userId?: string;
  ip?: string;
  endpoint?: string;
  payload?: any;
  userAgent?: string;
  [key: string]: any;
}

/**
 * Log a security event to monitoring system (Sentry)
 */
export function logSecurityEvent(
  event: SecurityEventType,
  severity: SecuritySeverity,
  metadata?: SecurityEventMetadata
) {
  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    const emoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨',
    }[severity];
    
    console.warn(`${emoji} [Security] ${event}`, metadata);
  }

  // Log to Sentry in production
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const sentryLevel = severity === 'critical' ? 'error' : 'warning';
    
    (window as any).Sentry.captureMessage(`Security: ${event}`, {
      level: sentryLevel,
      tags: {
        security_event: event,
        severity,
        ...metadata,
      },
      extra: metadata,
    });
  }
}

/**
 * Log rate limit violation
 */
export function logRateLimitViolation(
  identifier: string,
  endpoint: string,
  metadata?: Record<string, any>
) {
  logSecurityEvent('rate_limit_exceeded', 'medium', {
    identifier,
    endpoint,
    ...metadata,
  });
}

/**
 * Log invalid authentication attempt
 */
export function logInvalidAuth(
  reason: string,
  metadata?: SecurityEventMetadata
) {
  logSecurityEvent('invalid_auth_token', 'high', {
    reason,
    ...metadata,
  });
}

/**
 * Log unauthorized access attempt
 */
export function logUnauthorizedAccess(
  resource: string,
  metadata?: SecurityEventMetadata
) {
  logSecurityEvent('unauthorized_access', 'high', {
    resource,
    ...metadata,
  });
}

/**
 * Log potential XSS attempt
 */
export function logXSSAttempt(
  payload: string,
  metadata?: SecurityEventMetadata
) {
  logSecurityEvent('xss_attempt', 'critical', {
    payload: payload.substring(0, 200), // Truncate for safety
    ...metadata,
  });
}

/**
 * Log potential SQL injection attempt
 */
export function logSQLInjectionAttempt(
  payload: string,
  metadata?: SecurityEventMetadata
) {
  logSecurityEvent('sql_injection_attempt', 'critical', {
    payload: payload.substring(0, 200), // Truncate for safety
    ...metadata,
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(
  description: string,
  metadata?: SecurityEventMetadata
) {
  logSecurityEvent('suspicious_activity', 'medium', {
    description,
    ...metadata,
  });
}

/**
 * Detect and log potential XSS in input
 */
export function detectXSS(input: string, fieldName: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<img[^>]+onerror/gi,
    /<svg[^>]+onload/gi,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      logXSSAttempt(input, {
        fieldName,
        pattern: pattern.toString(),
      });
      return true;
    }
  }

  return false;
}

/**
 * Detect and log potential SQL injection in input
 */
export function detectSQLInjection(input: string, fieldName: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(\bOR\b.*=.*)/gi,
    /('.*OR.*'.*=.*')/gi,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      logSQLInjectionAttempt(input, {
        fieldName,
        pattern: pattern.toString(),
      });
      return true;
    }
  }

  return false;
}

/**
 * Get security metrics for monitoring dashboard
 */
export function getSecurityMetrics() {
  // This would typically fetch from a backend API
  // For now, return placeholder data
  return {
    rateLimitViolations: 0,
    authFailures: 0,
    xssAttempts: 0,
    sqlInjectionAttempts: 0,
    suspiciousActivities: 0,
  };
}
