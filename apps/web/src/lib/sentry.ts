import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Utility Functions
 * 
 * Helper functions for common Sentry operations in the KeMana app.
 * Use these to manually capture errors, set context, and track performance.
 */

/**
 * Capture an exception with additional context
 * Use this for manually reporting errors that aren't caught by the ErrorBoundary
 * 
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureException(error, { context: "payment_processing", userId: "123" });
 * }
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): string | null {
  if (!Sentry.getClient()) {
    console.warn("[Sentry] Client not initialized, logging to console:", error);
    return null;
  }

  if (context) {
    return Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      return Sentry.captureException(error);
    });
  }

  return Sentry.captureException(error);
}

/**
 * Capture a message (for informational alerts)
 * 
 * @example
 * captureMessage("User completed onboarding", "info");
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
): string | null {
  if (!Sentry.getClient()) {
    console.log(`[Sentry ${level}]`, message);
    return null;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user information for Sentry events
 * Call this when user logs in or user info changes
 * 
 * @example
 * setUser({ id: "123", email: "user@example.com", username: "john" });
 */
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}): void {
  if (!Sentry.getClient()) return;

  Sentry.setUser(user);
}

/**
 * Clear user information (call on logout)
 */
export function clearUser(): void {
  if (!Sentry.getClient()) return;

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs help trace the sequence of events leading to an error
 * 
 * @example
 * addBreadcrumb("User opened transaction form", "ui");
 * addBreadcrumb("API request started", "http", { url: "/api/transactions" });
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info"
): void {
  if (!Sentry.getClient()) {
    console.log(`[Breadcrumb ${category}]`, message, data);
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  });
}

/**
 * Set tags for all subsequent events
 * Tags are searchable in Sentry and useful for filtering
 * 
 * @example
 * setTag("feature", "bulk_import");
 * setTag("platform", "ios");
 */
export function setTag(key: string, value: string): void {
  if (!Sentry.getClient()) return;

  Sentry.setTag(key, value);
}

/**
 * Set context for all subsequent events
 * Context provides structured data about the current state
 * 
 * @example
 * setContext("transaction", { id: "123", amount: 50000, type: "expense" });
 */
export function setContext(
  name: string,
  context: Record<string, unknown>
): void {
  if (!Sentry.getClient()) return;

  Sentry.setContext(name, context);
}

/**
 * Start a performance transaction
 * Useful for tracking custom operations
 * 
 * @example
 * const result = await startTransaction("import_data", "data.processing", async () => {
 *   return await processData();
 * });
 */
export function startTransaction<T>(
  name: string,
  op: string,
  callback: () => T
): T | null {
  if (!Sentry.getClient()) return callback();

  return Sentry.startSpan({ name, op }, callback);
}

/**
 * Wrap a function with performance tracking
 * Automatically starts and finishes a transaction around the function execution
 * 
 * @example
 * const result = await withPerformanceTracking("fetch_transactions", () => 
 *   fetchTransactions()
 * );
 */
export async function withPerformanceTracking<T>(
  name: string,
  fn: () => Promise<T>,
  op: string = "function"
): Promise<T> {
  if (!Sentry.getClient()) {
    return fn();
  }

  return Sentry.startSpan({ name, op }, async () => {
    return await fn();
  });
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return !!Sentry.getClient();
}

/**
 * Show Sentry feedback dialog
 * Use this to allow users to report issues manually
 * 
 * @example
 * <button onClick={() => showFeedbackDialog()}>Report Issue</button>
 */
export function showFeedbackDialog(eventId?: string): void {
  if (!Sentry.getClient()) {
    console.warn("[Sentry] Client not initialized");
    return;
  }

  Sentry.showReportDialog({
    eventId,
    title: "Laporkan Masalah",
    subtitle: "Bantu kami memperbaiki aplikasi KeMana",
    subtitle2: "Jelaskan masalah yang Anda alami",
    labelName: "Nama",
    labelEmail: "Email",
    labelComments: "Deskripsi masalah",
    labelClose: "Tutup",
    labelSubmit: "Kirim Laporan",
    errorGeneric: "Terjadi kesalahan. Silakan coba lagi.",
    errorFormEntry: "Periksa kembali isian Anda.",
    successMessage: "Terima kasih atas laporannya!",
  });
}

/**
 * Configure scope for a specific operation
 * Useful when you want to add context only for a specific operation
 * 
 * @example
 * await withScope(async (scope) => {
 *   scope.setTag("operation", "bulk_delete");
 *   scope.setExtra("count", items.length);
 *   await performBulkDelete(items);
 * });
 */
export async function withScope<T>(
  callback: (scope: Sentry.Scope) => Promise<T>
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    return await callback(scope);
  });
}

// Export Sentry for advanced use cases
export { Sentry };
