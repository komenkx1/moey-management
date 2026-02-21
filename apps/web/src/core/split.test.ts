import { describe, expect, it } from "vitest";
import { buildCustomSplit, buildEqualSplit, normalizePeople, owesSummary } from "@kemana/core/split";
import type { SplitShare } from "@kemana/core/types";

describe("normalizePeople", () => {
    it("deduplicates and trims names", () => {
        expect(normalizePeople(["  Alice  ", "Bob", "Alice", ""])).toEqual(["Alice", "Bob"]);
    });

    it("handles empty arrays", () => {
        expect(normalizePeople([])).toEqual([]);
    });
});

describe("buildEqualSplit", () => {
    it("splits evenly when divisible", () => {
        const result = buildEqualSplit(90000, ["Alice", "Bob", "Charlie"]);
        expect(result).toEqual([
            { person: "Alice", amount: 30000 },
            { person: "Bob", amount: 30000 },
            { person: "Charlie", amount: 30000 }
        ]);
    });

    it("distributes remainder iteratively", () => {
        const result = buildEqualSplit(100000, ["Alice", "Bob", "Charlie"]);
        expect(result).toEqual([
            { person: "Alice", amount: 33334 },
            { person: "Bob", amount: 33333 },
            { person: "Charlie", amount: 33333 }
        ]);
    });

    it("handles 1 person (full amount)", () => {
        const result = buildEqualSplit(50000, ["Alice"]);
        expect(result).toEqual([{ person: "Alice", amount: 50000 }]);
    });

    it("returns empty for 0 people", () => {
        const result = buildEqualSplit(50000, []);
        expect(result).toEqual([]);
    });
});

describe("buildCustomSplit", () => {
    it("returns valid split when total matches", () => {
        const shares: SplitShare[] = [
            { person: "Alice", amount: 20000 },
            { person: "Bob", amount: 30000 }
        ];
        const result = buildCustomSplit(50000, shares);
        expect(result).toEqual(shares);
    });

    it("returns null when total mismatches", () => {
        const shares: SplitShare[] = [
            { person: "Alice", amount: 20000 },
            { person: "Bob", amount: 20000 }
        ];
        const result = buildCustomSplit(50000, shares);
        expect(result).toBeNull();
    });

    it("rounds floats and filters empty names", () => {
        const shares: SplitShare[] = [
            { person: " Alice ", amount: 20000.4 },
            { person: "", amount: 10000 },
            { person: "Bob", amount: 29999.6 }
        ];
        const result = buildCustomSplit(50000, shares);
        expect(result).toEqual([
            { person: "Alice", amount: 20000 },
            { person: "Bob", amount: 30000 }
        ]);
    });
});

describe("owesSummary", () => {
    it("generates correct strings for owes logic", () => {
        const shares: SplitShare[] = [
            { person: "Alice", amount: 30000 }, // Payer
            { person: "Bob", amount: 15000 },
            { person: "Charlie", amount: 15000 }
        ];
        expect(owesSummary(shares)).toEqual([
            "Bob owes Alice 15000",
            "Charlie owes Alice 15000"
        ]);
    });

    it("skips people who owe 0", () => {
        const shares: SplitShare[] = [
            { person: "Alice", amount: 60000 },
            { person: "Bob", amount: 0 },
            { person: "Charlie", amount: 0 }
        ];
        expect(owesSummary(shares)).toEqual([]);
    });

    it("handles single payer gracefully", () => {
        const shares: SplitShare[] = [{ person: "Alice", amount: 30000 }];
        expect(owesSummary(shares)).toEqual([]);
    });
});
