import { describe, expect, it } from "vitest";
import { inferCategory, keywordFromText, updateCategoryRule } from "@kemana/core/rules";
import type { CategoryRules } from "@kemana/core/types";

describe("keywordFromText", () => {
    it("extracts the first word lowercase", () => {
        expect(keywordFromText("  Nasi Goreng special  ")).toBe("nasi");
    });

    it("handles empty strings", () => {
        expect(keywordFromText("")).toBe("");
        expect(keywordFromText("   ")).toBe("");
    });
});

describe("inferCategory", () => {
    const rules: CategoryRules = [
        { pattern: "sushi", match: "equals", category: "Makan" },
        { pattern: "nintendo", match: "contains", category: "Hiburan" }
    ];

    it("matches exact 'equals' rules", () => {
        expect(inferCategory("sushi", rules)).toBe("Makan");
    });

    it("matches substring 'contains' rules", () => {
        expect(inferCategory("beli kaset nintendo switch", rules)).toBe("Hiburan");
    });

    it("falls back to default keywords", () => {
        expect(inferCategory("pesan gojek", [])).toBe("Transport");
        expect(inferCategory("beli token listrik", [])).toBe("Tagihan");
    });

    it("returns 'Lainnya' when no rules match", () => {
        expect(inferCategory("bayar pajak", [])).toBe("Lainnya");
    });

    it("returns 'Lainnya' for empty strings", () => {
        expect(inferCategory("   ", rules)).toBe("Lainnya");
    });
});

describe("updateCategoryRule", () => {
    it("adds a new rule if keyword does not exist", () => {
        const rules: CategoryRules = [];
        const next = updateCategoryRule(rules, "McDonalds", "Makan");

        expect(next).toEqual([
            { pattern: "mcdonalds", match: "contains", category: "Makan" }
        ]);
    });

    it("replaces existing rule with same pattern", () => {
        const rules: CategoryRules = [
            { pattern: "kopi", match: "contains", category: "Lainnya" }
        ];
        const next = updateCategoryRule(rules, "Kopi kenangan", "Makan");

        expect(next).toEqual([
            { pattern: "kopi", match: "contains", category: "Makan" }
        ]);
        expect(next).not.toBe(rules); // immutable check
    });

    it("does nothing for empty text", () => {
        const rules: CategoryRules = [];
        const next = updateCategoryRule(rules, "   ", "Makan");
        expect(next).toBe(rules);
    });
});
