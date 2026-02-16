import { SplitShare } from "./types";

export function normalizePeople(input: string[]): string[] {
  const deduplicated = new Set<string>();
  for (const raw of input) {
    const clean = raw.trim();
    if (clean) {
      deduplicated.add(clean);
    }
  }
  return Array.from(deduplicated);
}

export function buildEqualSplit(totalAmount: number, people: string[]): SplitShare[] {
  const normalized = normalizePeople(people);
  if (normalized.length === 0) {
    return [];
  }

  const base = Math.floor(totalAmount / normalized.length);
  const remainder = totalAmount - base * normalized.length;

  return normalized.map((person, index) => ({
    person,
    amount: base + (index < remainder ? 1 : 0)
  }));
}

export function buildCustomSplit(totalAmount: number, shares: SplitShare[]): SplitShare[] | null {
  const normalized = shares
    .map((share) => ({
      person: share.person.trim(),
      amount: Number.isFinite(share.amount) ? Math.max(0, Math.round(share.amount)) : 0
    }))
    .filter((share) => share.person.length > 0);

  const totalShares = normalized.reduce((sum, share) => sum + share.amount, 0);
  if (totalShares !== totalAmount) {
    return null;
  }

  return normalized;
}

export function owesSummary(shares: SplitShare[]): string[] {
  if (shares.length <= 1) {
    return [];
  }

  const [payer, ...rest] = shares;
  return rest
    .filter((share) => share.amount > 0)
    .map((share) => `${share.person} owes ${payer.person} ${share.amount}`);
}
