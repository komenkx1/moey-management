import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./parser";

describe("parseQuickAdd", () => {
  it("parses k suffix amount", () => {
    const result = parseQuickAdd("parkir 2k");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(2_000);
    }
  });

  it("parses bare amount with ribuan heuristic and warning", () => {
    const result = parseQuickAdd("kopi 18", new Date("2026-02-17T00:00:00.000Z"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("kopi");
      expect(result.value.amount).toBe(18_000);
      expect(result.value.date).toBe("2026-02-17");
      expect(result.value.source).toBe("quick_add");
      const warning = result.warnings?.find((item) => item.code === "ASSUMED_THOUSANDS");
      expect(warning).toBeDefined();
      expect(warning?.message).toBe("Nominal diasumsikan ribuan");
      expect(warning?.meta?.interpretedAmount).toBe(18_000);
    }
  });

  it("parses cleaned amount token", () => {
    const result = parseQuickAdd("kopi Rp18k,");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(18_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_TOKEN_CLEANED")).toBe(true);
    }
  });

  it("ignores splitCount when token is 1p", () => {
    const result = parseQuickAdd("dinner 120 1p");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(120_000);
      expect(result.value.splitCount).toBeUndefined();
      expect(result.warnings?.some((warning) => warning.code === "SPLIT_COUNT_IGNORED")).toBe(true);
    }
  });

  it("rejects splitCount 0p", () => {
    const result = parseQuickAdd("dinner 120 0p");
    expect(result.ok).toBe(false);
  });

  it("parses rb suffix and split token", () => {
    const result = parseQuickAdd("tol 5rb 3p");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(5_000);
      expect(result.value.splitCount).toBe(3);
    }
  });

  it("rejects splitCount above upper bound", () => {
    const result = parseQuickAdd("dinner 120 99p");
    expect(result.ok).toBe(false);
  });

  it("sums multiple inline amounts with warning", () => {
    const result = parseQuickAdd("gacoan 25 + 10 + 5");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(40_000);
      const sumWarning = result.warnings?.find((warning) => warning.code === "AMOUNT_SUMMED");
      expect(sumWarning).toBeDefined();
      expect(sumWarning?.message).toBe("Nominal dijumlahkan otomatis");
      expect(sumWarning?.meta?.parts).toBe(3);
      expect(sumWarning?.meta?.total).toBe(40_000);
    }
  });

  it("sums k suffix amounts", () => {
    const result = parseQuickAdd("mie 2k + 3k");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(5_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).toBe(true);
    }
  });

  it("sums inline amounts and keeps split token at the end", () => {
    const result = parseQuickAdd("gacoan 25 + 10 3p");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(35_000);
      expect(result.value.splitCount).toBe(3);
      const sumWarning = result.warnings?.find((warning) => warning.code === "AMOUNT_SUMMED");
      expect(sumWarning?.meta?.parts).toBe(2);
      expect(sumWarning?.meta?.total).toBe(35_000);
    }
  });

  it("sums amounts separated by words when plus operator is present", () => {
    const result = parseQuickAdd("mie 25 + nasi 7");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(32_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).toBe(true);
    }
  });

  it("sums amounts when plus has no spaces", () => {
    const result = parseQuickAdd("nasi 30k+kopi 15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("nasi, kopi");
      expect(result.value.amount).toBe(45_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).toBe(true);
    }
  });

  it("keeps item separator readable in summed text", () => {
    const result = parseQuickAdd("happy - nasi goreng + nasi 25 + 25");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("happy - nasi goreng, nasi");
      expect(result.value.amount).toBe(50_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).toBe(true);
    }
  });

  it("sums chained plus tokens with words and no spaces", () => {
    const result = parseQuickAdd("30k+kopi+5k");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("kopi");
      expect(result.value.amount).toBe(35_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).toBe(true);
    }
  });

  it("sums chained plus tokens and keeps split token", () => {
    const result = parseQuickAdd("30k+kopi+5k 3p");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(35_000);
      expect(result.value.splitCount).toBe(3);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).toBe(true);
    }
  });

  it("keeps legacy split behavior without summed warning", () => {
    const result = parseQuickAdd("dinner 120 3p");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(120_000);
      expect(result.value.splitCount).toBe(3);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).not.toBe(true);
    }
  });

  it("does not enter summed mode for plus in non-numeric token C++", () => {
    const result = parseQuickAdd("vitamin C++ 20k");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(20_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).not.toBe(true);
    }
  });

  it("does not enter summed mode for grade-like token A+", () => {
    const result = parseQuickAdd("A+ 20k");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(20_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).not.toBe(true);
    }
  });

  it("does not sum when plus is not between numbers", () => {
    const result = parseQuickAdd("mie + es teh 10k");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(10_000);
      expect(result.warnings?.some((warning) => warning.code === "AMOUNT_SUMMED")).not.toBe(true);
    }
  });
});
