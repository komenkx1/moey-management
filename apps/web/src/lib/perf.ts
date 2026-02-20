const DEBUG_PERF_KEY = "DEBUG_PERF";
const QUICK_ADD_ACK_SAMPLES_KEY = "kemana.perf.quickAddAck.v1";
const MAX_SAMPLES = 50;

interface QuickAddAckSample {
  durationMs: number;
  at: string;
}

type PerfWindow = Window & {
  __KEMANA_PERF__?: {
    quickAddAckMs: QuickAddAckSample[];
  };
  requestIdleCallback?: (callback: (deadline?: unknown) => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function isPerfDebugEnabled(): boolean {
  if (!canUseWindow()) {
    return false;
  }

  try {
    return window.localStorage.getItem(DEBUG_PERF_KEY) === "true";
  } catch {
    return false;
  }
}

function isAckSample(value: unknown): value is QuickAddAckSample {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.durationMs === "number" && Number.isFinite(record.durationMs) && typeof record.at === "string";
}

export function recordQuickAddAck(durationMs: number): void {
  if (!isPerfDebugEnabled()) {
    return;
  }

  const rounded = Math.max(0, Math.round(durationMs * 100) / 100);
  const sample: QuickAddAckSample = {
    durationMs: rounded,
    at: new Date().toISOString()
  };

  try {
    const raw = window.localStorage.getItem(QUICK_ADD_ACK_SAMPLES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const currentSamples = Array.isArray(parsed) ? parsed.filter(isAckSample) : [];
    const nextSamples = [...currentSamples, sample].slice(-MAX_SAMPLES);
    window.localStorage.setItem(QUICK_ADD_ACK_SAMPLES_KEY, JSON.stringify(nextSamples));

    const perfWindow = window as PerfWindow;
    perfWindow.__KEMANA_PERF__ = {
      quickAddAckMs: nextSamples
    };

    console.info(`[perf] quick_add_ack_ms=${rounded}`);
  } catch {
    // Ignore storage/log failures in debug-only path.
  }
}

export function scheduleBackgroundTask(task: () => void): () => void {
  if (!canUseWindow()) {
    return () => {};
  }

  const perfWindow = window as PerfWindow;
  if (typeof perfWindow.requestIdleCallback === "function") {
    const handle = perfWindow.requestIdleCallback(() => {
      task();
    }, { timeout: 700 });

    return () => {
      if (typeof perfWindow.cancelIdleCallback === "function") {
        perfWindow.cancelIdleCallback(handle);
      }
    };
  }

  const timer = window.setTimeout(task, 0);
  return () => window.clearTimeout(timer);
}
