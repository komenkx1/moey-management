import { CategoryRules, Entry } from "../core/types";

const ENTRIES_KEY = "kemana.entries.v1";
const RULES_KEY = "kemana.rules.v1";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadEntries(): Entry[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  if (!canUseLocalStorage()) {
    return;
  }
  window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadRules(): CategoryRules {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RULES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as CategoryRules;
    }

    // Backward compatibility for old map format { keyword: category }.
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, string>).map(([pattern, category]) => ({
        pattern: pattern.trim().toLowerCase(),
        match: "contains" as const,
        category: category as CategoryRules[number]["category"]
      }));
    }

    return [];
  } catch {
    return [];
  }
}

export function saveRules(rules: CategoryRules): void {
  if (!canUseLocalStorage()) {
    return;
  }
  window.localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}
