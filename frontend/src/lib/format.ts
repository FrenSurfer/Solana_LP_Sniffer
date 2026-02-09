export function formatNumber(n: number): string {
  return n
    .toLocaleString("en-US", { maximumFractionDigits: 0 })
    .replace(/,/g, " ");
}

export function formatPercent(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatRatio(n: number): string {
  return n.toFixed(4);
}
