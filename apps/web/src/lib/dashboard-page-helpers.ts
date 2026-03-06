import type { Entry } from "@kemana/core/types";

export type ThemeMode = "light" | "dark";

const THEME_MODE_KEY = "kemana.themeMode";

export function resolveThemeModeFromStorage(root: HTMLElement): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_MODE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore storage read errors and fallback to DOM/system preference.
  }

  if (root.classList.contains("dark")) {
    return "dark";
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function persistThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Ignore storage write errors to keep theme toggle usable.
  }
}

export function createEntryId(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function toParserAmountToken(amount: number): string {
  const normalizedAmount = Math.max(0, Math.round(amount));
  if (normalizedAmount >= 1_000 && normalizedAmount % 1_000 === 0) {
    return `${normalizedAmount / 1_000}k`;
  }
  return String(normalizedAmount);
}

export function escapeCsvCell(value: string): string {
  if (!/[\",\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

export async function triggerDownloadFromText(params: {
  content: string;
  mimeType: string;
  filename: string;
}): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const { content, mimeType, filename } = params;

  // Di native (iOS/Android), gunakan Filesystem + Share
  try {
    const { nativeShareFile } = await import("@/lib/native-download");
    const handled = await nativeShareFile({ content, filename });
    if (handled) return;
  } catch {
    // Fallback ke web download
  }

  // Web fallback: blob URL + anchor click
  const blobLike =
    typeof File === "function"
      ? new File([content], filename, { type: mimeType })
      : new Blob([content], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(blobLike);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.setAttribute("download", filename);
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, 1200);
}

export function sortEntriesNewestFirst(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const aTime = Number.isFinite(Date.parse(a.createdAt))
      ? Date.parse(a.createdAt)
      : Number.isFinite(Date.parse(a.updatedAt))
        ? Date.parse(a.updatedAt)
        : Number.NEGATIVE_INFINITY;
    const bTime = Number.isFinite(Date.parse(b.createdAt))
      ? Date.parse(b.createdAt)
      : Number.isFinite(Date.parse(b.updatedAt))
        ? Date.parse(b.updatedAt)
        : Number.NEGATIVE_INFINITY;
    return bTime - aTime;
  });
}
