import { describe, expect, it } from "vitest";
import type { Entry } from "@kemana/core/types";
import {
  deriveAdaptiveHint,
  deriveAdaptiveRecallItems,
  deriveNotesVirtualizationPlan,
  deriveInsightCoachCopy,
  deriveInsightSummary,
  deriveInsightSevenDay,
  deriveInsightTrendBadge,
  deriveInsightWhyCards,
  deriveLatestEntryInsight,
  deriveQuickHistorySuggestions,
  deriveQuickFormatTemplates,
  extractQuickFormatKeyword,
  getQuickInputPlaceholder,
  getInitialNotesRenderCount,
  getNextNotesRenderCount,
  getEntryActivityTimestamp
} from "@/lib/dashboard-page-utils";

function makeEntry(overrides?: Partial<Entry>): Entry {
  const fallbackIso = new Date("2026-02-22T10:00:00.000Z").toISOString();
  return {
    id: "entry",
    text: "test",
    amount: 10000,
    date: "2026-02-22",
    category: "Makan",
    paymentMethod: "Cash",
    source: "quick_add",
    createdAt: fallbackIso,
    updatedAt: fallbackIso,
    ...overrides
  };
}

describe("dashboard-page-utils", () => {
  it("extractQuickFormatKeyword mengambil kata kunci non-nominal", () => {
    expect(extractQuickFormatKeyword("mcd 3x 15k")).toBe("mcd");
    expect(extractQuickFormatKeyword("20k + 15k")).toBeNull();
  });

  it("deriveQuickFormatTemplates memprioritaskan intent qty", () => {
    const templates = deriveQuickFormatTemplates({
      quickInput: "mcd x",
      fallbackBase: "kopi"
    });

    expect(templates[0].id).toBe("qty");
    expect(templates.some((item) => item.sample.includes("mcd"))).toBe(true);
  });

  it("getEntryActivityTimestamp fallback ke updatedAt/date", () => {
    const withoutCreated = makeEntry({
      createdAt: "invalid",
      updatedAt: "2026-02-21T08:00:00.000Z",
      date: "2026-02-20"
    });
    expect(getEntryActivityTimestamp(withoutCreated)).toBe(Date.parse("2026-02-21T08:00:00.000Z"));

    const withoutDates = makeEntry({
      createdAt: "invalid",
      updatedAt: "invalid",
      date: "2026-02-20"
    });
    expect(getEntryActivityTimestamp(withoutDates)).toBe(Date.parse("2026-02-20T12:00:00"));
  });

  it("deriveInsightSevenDay menghitung total, pembanding, dan top driver", () => {
    const now = new Date("2026-02-22T12:00:00.000Z");
    const entries: Entry[] = [
      makeEntry({
        id: "c1",
        text: "mcd",
        amount: 30000,
        category: "Makan",
        paymentMethod: "Cash",
        date: "2026-02-22",
        createdAt: "2026-02-22T09:00:00.000Z"
      }),
      makeEntry({
        id: "c2",
        text: "mcd 2",
        amount: 45000,
        category: "Makan",
        paymentMethod: "QRIS",
        date: "2026-02-21",
        createdAt: "2026-02-21T18:00:00.000Z"
      }),
      makeEntry({
        id: "c3",
        text: "gojek",
        amount: 20000,
        category: "Transport",
        paymentMethod: "Debit",
        date: "2026-02-20",
        createdAt: "2026-02-20T07:00:00.000Z",
        split: {
          mode: "equal",
          payer: "Kamu",
          shares: [
            { person: "Kamu", amount: 10000 },
            { person: "Budi", amount: 10000 }
          ]
        }
      }),
      makeEntry({
        id: "c4",
        text: "kopi",
        amount: 10000,
        category: "Makan",
        paymentMethod: "Cash",
        date: "2026-02-20",
        createdAt: "2026-02-20T20:00:00.000Z"
      }),
      makeEntry({
        id: "p1",
        text: "pekan lalu",
        amount: 50000,
        category: "Belanja",
        paymentMethod: "Transfer",
        date: "2026-02-14",
        createdAt: "2026-02-14T10:00:00.000Z"
      })
    ];

    const summary = deriveInsightSevenDay(entries, now);
    expect(summary.total).toBe(95000);
    expect(summary.previousTotal).toBe(50000);
    expect(summary.delta).toBe(45000);
    expect(summary.direction).toBe("up");
    expect(summary.deltaPct).toBe(90);
    expect(summary.topCategory?.category).toBe("Makan");
    expect(summary.largestEntries[0]?.id).toBe("c2");
    expect(summary.topCategories.length).toBeGreaterThan(0);
  });

  it("deriveInsightWhyCards, coach copy, dan trend badge konsisten dengan summary", () => {
    const summary = deriveInsightSevenDay(
      [
        makeEntry({
          id: "now",
          text: "dinner",
          amount: 60000,
          category: "Makan",
          paymentMethod: "Cash",
          date: "2026-02-22",
          createdAt: "2026-02-22T19:00:00.000Z"
        }),
        makeEntry({
          id: "prev",
          text: "prev",
          amount: 20000,
          category: "Makan",
          paymentMethod: "Cash",
          date: "2026-02-14",
          createdAt: "2026-02-14T10:00:00.000Z"
        })
      ],
      new Date("2026-02-22T12:00:00.000Z")
    );

    const whyCards = deriveInsightWhyCards(summary);
    const coach = deriveInsightCoachCopy(summary);
    const trend = deriveInsightTrendBadge(summary);
    const timeCard = whyCards.find((card) => card.key === "time");
    const moneyCards = whyCards.filter((card) => card.key !== "time");

    expect(whyCards.length).toBeGreaterThan(0);
    expect(timeCard?.isCurrencyDetail).toBe(false);
    expect(moneyCards.every((card) => card.isCurrencyDetail)).toBe(true);
    expect(coach.primaryLabel).toBe("Catat sekarang");
    expect(trend.tone).toBe("up");
    expect(trend.label).toContain("%");
  });

  it("deriveInsightSummary mengikuti preset 30d dan punya pembanding rentang sama", () => {
    const summary = deriveInsightSummary(
      [
        makeEntry({
          id: "cur-1",
          amount: 90000,
          date: "2026-02-22",
          createdAt: "2026-02-22T09:00:00.000Z"
        }),
        makeEntry({
          id: "prev-1",
          amount: 60000,
          date: "2026-01-20",
          createdAt: "2026-01-20T10:00:00.000Z"
        })
      ],
      "30d",
      new Date("2026-02-22T12:00:00.000Z")
    );

    expect(summary.periodLabel).toBe("30 hari terakhir");
    expect(summary.comparisonLabel).toBe("30 hari sebelumnya");
    expect(summary.windowDays).toBe(30);
    expect(summary.total).toBe(90000);
    expect(summary.previousTotal).toBe(60000);
  });

  it("deriveInsightSummary preset all menghasilkan trend netral tanpa pembanding", () => {
    const summary = deriveInsightSummary(
      [
        makeEntry({
          id: "a",
          amount: 120000,
          date: "2026-02-22",
          createdAt: "2026-02-22T09:00:00.000Z"
        }),
        makeEntry({
          id: "b",
          amount: 30000,
          date: "2026-01-10",
          createdAt: "2026-01-10T10:00:00.000Z"
        })
      ],
      "all",
      new Date("2026-02-22T12:00:00.000Z")
    );

    const trend = deriveInsightTrendBadge(summary);
    expect(summary.comparisonLabel).toBeNull();
    expect(summary.windowDays).toBeNull();
    expect(trend.tone).toBe("neutral");
    expect(trend.label).toBe("Rentang data penuh");
  });

  it("deriveInsightSummary preset custom memakai rentang manual", () => {
    const summary = deriveInsightSummary(
      [
        makeEntry({
          id: "c-1",
          amount: 80000,
          date: "2026-02-21",
          createdAt: "2026-02-21T09:00:00.000Z"
        }),
        makeEntry({
          id: "c-2",
          amount: 40000,
          date: "2026-02-19",
          createdAt: "2026-02-19T09:00:00.000Z"
        }),
        makeEntry({
          id: "old",
          amount: 100000,
          date: "2026-02-10",
          createdAt: "2026-02-10T09:00:00.000Z"
        })
      ],
      "custom",
      new Date("2026-02-22T12:00:00.000Z"),
      { start: "2026-02-19", end: "2026-02-21" }
    );

    expect(summary.total).toBe(120000);
    expect(summary.windowDays).toBe(3);
    expect(summary.comparisonLabel).toBe("3 hari sebelumnya");
  });

  it("deriveQuickHistorySuggestions urut berdasarkan frekuensi lalu recency", () => {
    const entries: Entry[] = [
      makeEntry({
        id: "h-1",
        text: "Mcd - pagi",
        date: "2026-02-22",
        createdAt: "2026-02-22T10:00:00.000Z"
      }),
      makeEntry({
        id: "h-2",
        text: "Mcd - sore",
        date: "2026-02-21",
        createdAt: "2026-02-21T10:00:00.000Z"
      }),
      makeEntry({
        id: "h-3",
        text: "Mie ayam",
        date: "2026-02-22",
        createdAt: "2026-02-22T11:00:00.000Z"
      })
    ];

    const suggestions = deriveQuickHistorySuggestions(entries, "mc");
    expect(suggestions[0]).toBe("Mcd");
    expect(suggestions.length).toBe(1);
  });

  it("deriveAdaptiveRecallItems mengembalikan maksimal 6 item dengan amount rata-rata", () => {
    const now = Date.parse("2026-02-22T12:00:00.000Z");
    const items = deriveAdaptiveRecallItems(
      [
        makeEntry({
          id: "a1",
          text: "Kopi",
          amount: 10000,
          date: "2026-02-22",
          createdAt: "2026-02-22T10:00:00.000Z"
        }),
        makeEntry({
          id: "a2",
          text: "Kopi",
          amount: 20000,
          date: "2026-02-21",
          createdAt: "2026-02-21T10:00:00.000Z"
        }),
        makeEntry({
          id: "a3",
          text: "Makan siang",
          amount: 35000,
          date: "2026-02-20",
          createdAt: "2026-02-20T10:00:00.000Z"
        })
      ],
      now
    );

    expect(items.length).toBeGreaterThan(0);
    const kopi = items.find((item) => item.title === "Kopi");
    expect(kopi?.amount).toBe(15000);
    expect(items.every((item) => item.amount > 0)).toBe(true);
  });

  it("deriveLatestEntryInsight dan deriveAdaptiveHint menghasilkan copy yang tepat", () => {
    const entries: Entry[] = [
      makeEntry({
        id: "l-1",
        text: "Nasi uduk",
        amount: 18000,
        createdAt: "2026-02-21T08:00:00.000Z"
      }),
      makeEntry({
        id: "l-2",
        text: "Makan malam",
        amount: 42000,
        createdAt: "2026-02-22T20:00:00.000Z"
      })
    ];

    const latest = deriveLatestEntryInsight(entries);
    expect(latest?.title).toBe("Makan malam");
    expect(latest?.amount).toBe(42000);

    const hint = deriveAdaptiveHint({
      id: "recall-1",
      category: "Makan",
      title: "Makan malam",
      amount: 42000
    });
    expect(hint).toContain("Makan malam");
    expect(deriveAdaptiveHint(null)).toContain("Belum ada pola");
  });

  it("getQuickInputPlaceholder mengikuti smart recall, primed, dan jam malam", () => {
    expect(
      getQuickInputPlaceholder({
        hasSmartRecallPrompt: true,
        recallInputPrimed: false,
        now: new Date("2026-02-22T09:00:00")
      })
    ).toBe("Barusan apa?");

    expect(
      getQuickInputPlaceholder({
        hasSmartRecallPrompt: false,
        recallInputPrimed: true,
        now: new Date("2026-02-22T09:00:00")
      })
    ).toBe("Barusan apa?");

    expect(
      getQuickInputPlaceholder({
        hasSmartRecallPrompt: false,
        recallInputPrimed: false,
        now: new Date("2026-02-22T20:00:00")
      })
    ).toBe("Keluar apa hari ini?");
  });

  it("virtualization plan aktif saat item > 1000 dan window awal 220", () => {
    const plan = deriveNotesVirtualizationPlan({
      totalEntries: 1001,
      requestedRenderCount: 220,
      threshold: 1000,
      chunkSize: 220
    });

    expect(plan.shouldVirtualize).toBe(true);
    expect(plan.visibleCount).toBe(220);
    expect(plan.hasMore).toBe(true);
  });

  it("virtualization plan non-aktif saat item <= threshold", () => {
    const plan = deriveNotesVirtualizationPlan({
      totalEntries: 1000,
      requestedRenderCount: 220,
      threshold: 1000,
      chunkSize: 220
    });

    expect(plan.shouldVirtualize).toBe(false);
    expect(plan.visibleCount).toBe(1000);
    expect(plan.hasMore).toBe(false);
  });

  it("render count helper menjaga window awal dan increment chunk", () => {
    expect(getInitialNotesRenderCount(1001, 1000, 220)).toBe(220);
    expect(getInitialNotesRenderCount(999, 1000, 220)).toBe(999);

    expect(getNextNotesRenderCount(220, 1001, 220)).toBe(440);
    expect(getNextNotesRenderCount(980, 1001, 220)).toBe(1001);
  });
});
