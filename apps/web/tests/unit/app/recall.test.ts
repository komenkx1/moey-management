import type { Entry } from "@kemana/core/types";
import { describe, expect, it } from "vitest";
import { formatRelativeTime, getSmartRecallPrompt } from "@/app/recall";

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
    const lastEntryAt = now - 2 * 60 * 60 * 1000;
    const entry = makeEntry({
      createdAt: new Date(lastEntryAt).toISOString(),
      date: toLocalDayKey(lastEntryAt)
    });

    const result = getSmartRecallPrompt({
      entries: [entry],
      lastAppOpenAt: now - 7 * 60 * 60 * 1000,
      now
    });

    expect(result?.kind).toBe("comeback");
  });

  it("returns null when the latest entry is still recent and app was opened recently", () => {
    const now = new Date(2026, 1, 20, 10, 0, 0).getTime();
    const lastEntryAt = now - 60 * 60 * 1000; // 1 jam lalu
    const entry = makeEntry({
      createdAt: new Date(lastEntryAt).toISOString(),
      updatedAt: new Date(lastEntryAt).toISOString(),
      date: toLocalDayKey(now)
    });

    const result = getSmartRecallPrompt({
      entries: [entry],
      lastAppOpenAt: now - 30 * 60 * 1000,
      now
    });

    expect(result).toBeNull();
  });

  // Task 6.1 - Verify new wording for recall prompts
  describe("new wording (Task 6.1)", () => {
    it("uses new wording for gap recall with formatRelativeTime", () => {
      const now = new Date(2026, 1, 20, 16, 0, 0).getTime();
      const lastEntryAt = now - 4 * 60 * 60 * 1000; // 4 hours ago
      const entry = makeEntry({
        createdAt: new Date(lastEntryAt).toISOString(),
        date: toLocalDayKey(now)
      });

      const result = getSmartRecallPrompt({
        entries: [entry],
        lastAppOpenAt: now - 60 * 60 * 1000,
        now
      });

      expect(result?.kind).toBe("gap");
      expect(result?.title).toBe("Sudah 4 jam lalu sejak catatan terakhir");
      expect(result?.subtitle).toBe("Cek lagi, mungkin ada pengeluaran setelah 12.00 yang belum masuk.");
    });

    it("uses new wording for first_today recall", () => {
      const now = new Date(2026, 1, 20, 14, 0, 0).getTime();
      const lastEntryAt = now - 24 * 60 * 60 * 1000; // Yesterday
      const entry = makeEntry({
        createdAt: new Date(lastEntryAt).toISOString(),
        date: toLocalDayKey(lastEntryAt)
      });

      const result = getSmartRecallPrompt({
        entries: [entry],
        lastAppOpenAt: now - 30 * 60 * 1000,
        now
      });

      expect(result?.kind).toBe("first_today");
      expect(result?.title).toBe("Belum ada catatan hari ini");
      expect(result?.subtitle).toBe("Ada pengeluaran yang belum masuk? Catat sekarang atau pakai tanggal kemarin.");
    });

    it("uses new wording for comeback recall", () => {
      const now = new Date(2026, 1, 20, 10, 0, 0).getTime();
      const lastEntryAt = now - 2 * 60 * 60 * 1000; // 2 hours ago
      const entry = makeEntry({
        createdAt: new Date(lastEntryAt).toISOString(),
        date: toLocalDayKey(lastEntryAt)
      });

      const result = getSmartRecallPrompt({
        entries: [entry],
        lastAppOpenAt: now - 7 * 60 * 60 * 1000, // 7 hours ago
        now
      });

      expect(result?.kind).toBe("comeback");
      expect(result?.title).toBe("Balik lagi setelah beberapa jam");
      expect(result?.subtitle).toBe("Kalau sempat keluar tadi, cek apakah ada transaksi yang belum kamu catat.");
    });

    it("gap recall uses formatRelativeTime with different time ranges", () => {
      const now = new Date(2026, 1, 20, 16, 0, 0).getTime();
      
      // Test with 30 minutes ago (should show minutes)
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      const entry1 = makeEntry({
        createdAt: new Date(thirtyMinutesAgo).toISOString(),
        date: toLocalDayKey(now)
      });

      const result1 = getSmartRecallPrompt({
        entries: [entry1],
        lastAppOpenAt: now - 60 * 60 * 1000,
        now
      });

      // 30 minutes is less than 3 hours, so no gap recall
      expect(result1).toBeNull();

      // Test with 5 hours ago (should show hours)
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
      const entry2 = makeEntry({
        createdAt: new Date(fiveHoursAgo).toISOString(),
        date: toLocalDayKey(now)
      });

      const result2 = getSmartRecallPrompt({
        entries: [entry2],
        lastAppOpenAt: now - 60 * 60 * 1000,
        now
      });

      expect(result2?.kind).toBe("gap");
      expect(result2?.title).toBe("Sudah 5 jam lalu sejak catatan terakhir");

      // Test with yesterday - use morning time (before noon) to avoid first_today condition
      const morningNow = new Date(2026, 1, 20, 10, 0, 0).getTime(); // 10 AM
      const yesterdayAt = morningNow - 30 * 60 * 60 * 1000; // 30 hours ago
      const entry3 = makeEntry({
        createdAt: new Date(yesterdayAt).toISOString(),
        date: toLocalDayKey(yesterdayAt)
      });

      const result3 = getSmartRecallPrompt({
        entries: [entry3],
        lastAppOpenAt: morningNow - 60 * 60 * 1000,
        now: morningNow
      });

      expect(result3?.kind).toBe("gap");
      expect(result3?.title).toBe("Sudah kemarin sejak catatan terakhir");
    });
  });
});

describe("formatRelativeTime", () => {
  it("formats minutes correctly for time less than 1 hour", () => {
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    expect(formatRelativeTime(thirtyMinutesAgo, now)).toBe("30 menit lalu");
  });

  it("formats 0 minutes for very recent timestamps", () => {
    const now = Date.now();
    const fiveSecondsAgo = now - 5 * 1000;
    expect(formatRelativeTime(fiveSecondsAgo, now)).toBe("0 menit lalu");
  });

  it("formats hours correctly for time between 1 and 24 hours", () => {
    const now = Date.now();
    const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
    expect(formatRelativeTime(fiveHoursAgo, now)).toBe("5 jam lalu");
  });

  it("formats 1 hour correctly", () => {
    const now = Date.now();
    const oneHourAgo = now - 1 * 60 * 60 * 1000;
    expect(formatRelativeTime(oneHourAgo, now)).toBe("1 jam lalu");
  });

  it("returns 'kemarin' for time between 24 and 48 hours", () => {
    const now = Date.now();
    const thirtyHoursAgo = now - 30 * 60 * 60 * 1000;
    expect(formatRelativeTime(thirtyHoursAgo, now)).toBe("kemarin");
  });

  it("returns 'kemarin' for exactly 24 hours ago", () => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(twentyFourHoursAgo, now)).toBe("kemarin");
  });

  it("formats days correctly for time 48 hours or more", () => {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(threeDaysAgo, now)).toBe("3 hari lalu");
  });

  it("formats 2 days correctly (exactly 48 hours)", () => {
    const now = Date.now();
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;
    expect(formatRelativeTime(twoDaysAgo, now)).toBe("2 hari lalu");
  });

  it("uses Date.now() as default when now parameter is not provided", () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const result = formatRelativeTime(fiveMinutesAgo);
    expect(result).toMatch(/\d+ menit lalu/);
  });

  it("handles large time differences correctly", () => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(thirtyDaysAgo, now)).toBe("30 hari lalu");
  });

  // Edge case tests for Task 5.3 - Requirements 2.5, 2.6, 2.7, 2.8
  describe("edge cases for formatRelativeTime", () => {
    it("returns '30 menit lalu' for exactly 30 minutes ago", () => {
      const now = Date.now();
      const thirtyMinutesAgo = now - 30 * 60 * 1000;
      expect(formatRelativeTime(thirtyMinutesAgo, now)).toBe("30 menit lalu");
    });

    it("returns '5 jam lalu' for exactly 5 hours ago", () => {
      const now = Date.now();
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
      expect(formatRelativeTime(fiveHoursAgo, now)).toBe("5 jam lalu");
    });

    it("returns 'kemarin' for exactly 36 hours ago", () => {
      const now = Date.now();
      const thirtySixHoursAgo = now - 36 * 60 * 60 * 1000;
      expect(formatRelativeTime(thirtySixHoursAgo, now)).toBe("kemarin");
    });

    it("returns '3 hari lalu' for exactly 3 days ago", () => {
      const now = Date.now();
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
      expect(formatRelativeTime(threeDaysAgo, now)).toBe("3 hari lalu");
    });

    // Boundary condition: exactly 1 hour
    it("returns '1 jam lalu' for exactly 1 hour (boundary between minutes and hours)", () => {
      const now = Date.now();
      const exactlyOneHour = now - 60 * 60 * 1000;
      expect(formatRelativeTime(exactlyOneHour, now)).toBe("1 jam lalu");
    });

    // Boundary condition: exactly 24 hours
    it("returns 'kemarin' for exactly 24 hours (boundary between hours and kemarin)", () => {
      const now = Date.now();
      const exactlyTwentyFourHours = now - 24 * 60 * 60 * 1000;
      expect(formatRelativeTime(exactlyTwentyFourHours, now)).toBe("kemarin");
    });

    // Boundary condition: exactly 48 hours
    it("returns '2 hari lalu' for exactly 48 hours (boundary between kemarin and days)", () => {
      const now = Date.now();
      const exactlyFortyEightHours = now - 48 * 60 * 60 * 1000;
      expect(formatRelativeTime(exactlyFortyEightHours, now)).toBe("2 hari lalu");
    });

    // Additional boundary tests for precision
    it("returns '59 menit lalu' for 59 minutes 59 seconds (just before 1 hour)", () => {
      const now = Date.now();
      const justBeforeOneHour = now - (59 * 60 * 1000 + 59 * 1000);
      expect(formatRelativeTime(justBeforeOneHour, now)).toBe("59 menit lalu");
    });

    it("returns '23 jam lalu' for 23 hours 59 minutes (just before 24 hours)", () => {
      const now = Date.now();
      const justBeforeTwentyFourHours = now - (23 * 60 * 60 * 1000 + 59 * 60 * 1000);
      expect(formatRelativeTime(justBeforeTwentyFourHours, now)).toBe("23 jam lalu");
    });

    it("returns 'kemarin' for 47 hours 59 minutes (just before 48 hours)", () => {
      const now = Date.now();
      const justBeforeFortyEightHours = now - (47 * 60 * 60 * 1000 + 59 * 60 * 1000);
      expect(formatRelativeTime(justBeforeFortyEightHours, now)).toBe("kemarin");
    });
  });
});
