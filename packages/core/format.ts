export function formatAmountIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

export function formatAmountCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const million = amount / 1_000_000;
    return `${stripTrailingZero(million.toFixed(1))}jt`;
  }

  if (amount >= 1_000) {
    const thousand = amount / 1_000;
    return `${stripTrailingZero(thousand.toFixed(1))}k`;
  }

  return `${amount}`;
}

function stripTrailingZero(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}
