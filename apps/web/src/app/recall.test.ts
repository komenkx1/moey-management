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

  it("shows first_today prompt when opened after noon without today's entries", () => {
    const now = new Date(2026, 1, 20, 14, 0, 0).getTime(); // 14:00 
    const lastEntryAt = now - 24 * 60 * 60 * 1000; // Yesterday
    const entry = makeEntry({
      createdAt: new Date(lastEntryAt).toISOString(),
      date: toLocalDayKey(lastEntryAt)
    });

    const result = getSmartRecallPrompt({
      entries: [entry],
      lastAppOpenAt: now - 30 * 60 * 1000, // 30 mins ago
      now
    });

    expect(result?.kind).toBe("first_today");
  });

  it("shows comeback prompt when gap is less than 3 hours but last open was > 6 hours ago", () => {
    const now = new Date(2026, 1, 20, 10, 0, 0).getTime();
    // Today's entry is within 3 hours (e.g. 2 hours ago), so "gap" doesn't trigger.
    const lastEntryAt = now - 2 * 60 * 60 * 1000;
    const entry = makeEntry({
      createdAt: new Date(lastEntryAt).toISOString(),
      date: toLocalDayKey(lastEntryAt)
    });

    const result = getSmartRecallPrompt({
      entries: [entry],
      // But user hasn't opened app for 7 hours. Wait, how could they add an entry 2 hours ago without opening the app? 
      // Maybe they used the PWA sync or another device. Let's just test the logic fallback.
      lastAppOpenAt: now - 7 * 60 * 60 * 1000,
      now
    });

    expect(result?.kind).toBe("comeback");
  });
});
