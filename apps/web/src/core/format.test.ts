import { describe, expect, it } from "vitest";
import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";

describe("formatAmountIDR", () => {
    it("formats 25000 to id-ID locale representation (dotted)", () => {
        expect(formatAmountIDR(25000)).toBe("25.000");
    });

    it("formats 0 correctly", () => {
        expect(formatAmountIDR(0)).toBe("0");
    });
});

describe("formatAmountCompact", () => {
    it("formats thousands cleanly", () => {
        expect(formatAmountCompact(25000)).toBe("25k");
        expect(formatAmountCompact(15500)).toBe("15.5k");
    });

    it("formats millions cleanly", () => {
        expect(formatAmountCompact(1500000)).toBe("1.5jt");
        expect(formatAmountCompact(2000000)).toBe("2jt");
    });

    it("formats sub-1000 without suffix", () => {
        expect(formatAmountCompact(500)).toBe("500");
    });

    it("strips trailing .0 zeros correctly", () => {
        expect(formatAmountCompact(10000)).toBe("10k");
        expect(formatAmountCompact(1000000)).toBe("1jt");
    });
});
