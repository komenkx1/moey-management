/**
 * Application-wide constants
 * Centralized configuration values for easy tuning
 */

// Performance & Rendering
export const NOTES_VIRTUALIZE_THRESHOLD = 1000;
export const NOTES_RENDER_CHUNK = 220;
export const QUICK_INPUT_DEBOUNCE_MS = 150;

// Timing & Durations
export const CONNECTION_BADGE_DURATION_MS = 2400;
export const HIGHLIGHT_ENTRY_DURATION_MS = 2800;
export const NIGHT_CLOSE_CONFIRMATION_DURATION_MS = 2600;
export const SCROLL_RETRY_INTERVAL_MS = 90;
export const SCROLL_MAX_ATTEMPTS = 4;
export const LAST_ENTRY_UPDATE_INTERVAL_MS = 60000; // 1 minute

// Storage Keys
export const STORAGE_KEYS = {
  LAST_OPEN_AT: "kemana.lastOpenAt",
  RECALL_DISMISSED_SESSION: "kemana.dismissedRecallUntil",
  USER_NAME: "kemana.userName",
  UPDATE_BANNER_DISMISSED_SESSION: "kemana.updateBanner.dismissedSession.v1",
  UPDATE_APPLIED: "kemana.updateApplied.v1",
  THEME_MODE: "kemana.themeMode",
  PWA_INSTALL_BANNER_SEEN: "pwa_install_banner_seen_v1",
  ZUSTAND_STORE: "kemana.ui.zustand.v1",
  PERF_DEBUG: "DEBUG_PERF",
  QUICK_ADD_ACK_SAMPLES: "kemana.perf.quickAddAck.v1"
} as const;

// Toast IDs (for deduplication)
export const TOAST_IDS = {
  MOVED: "kemana.moved",
  UNDO: "kemana.undo"
} as const;

// Background Task
export const BACKGROUND_TASK_TIMEOUT_MS = 700;

// Performance
export const MAX_PERF_SAMPLES = 50;
export const ENTRIES_UPDATE_DEBOUNCE_MS = 300; // Debounce for setEntries to reduce storage I/O

// Service Worker
export const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
