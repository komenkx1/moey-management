import type { Entry } from "@kemana/core/types";
import { describe, expect, it } from "vitest";
import { getSmartRecallPrompt } from "./recall";

function toLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeEntry(overrides?: Partial<Entry>): Entry {
  const fallbackNow = Date.parse("2026-02-20T10:00:00.000Z");
  const fallbackIso = new Date(fallbackNow).toISOString();
  return {
    id: "entry-1",
    text: "kopi",
    amount: 18_000,
    date: toLocalDayKey(fallbackNow),
    category: "Makan",
    source: "quick_add",
    createdAt: fallbackIso,
    updatedAt: fallbackIso,
    ...overrides
  };
}

describe("getSmartRecallPrompt", () => {
  it("returns null when there is no entry data yet", () => {
    const now = new Date(2026, 1, 20, 13, 0, 0).getTime();

    const result = getSmartRecallPrompt({
      entries: [],
      lastAppOpenAt: now - 7 * 60 * 60 * 1000,
      now
    });

    expect(result).toBeNull();
  });

  it("still shows gap prompt for existing users", () => {
    const now = new Date(2026, 1, 20, 16, 0, 0).getTime();
    const lastEntryAt = now - 4 * 60 * 60 * 1000;
    const entry = makeEntry({
      createdAt: new Date(lastEntryAt).toISOString(),
      updatedAt: new Date(lastEntryAt).toISOString(),
      date: toLocalDayKey(now)
    });

    const result = getSmartRecallPrompt({
      entries: [entry],
      lastAppOpenAt: now - 60 * 60 * 1000,
      now
    });

    expect(result?.kind).toBe("gap");
  });
});
