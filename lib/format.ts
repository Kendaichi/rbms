export function peso(n: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

// Compact peso for dense chart axes/labels, e.g. ₱16.5k, ₱1.2M.
export function pesoCompact(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${(v / 1_000).toFixed(1)}k`;
  return `₱${Math.round(v)}`;
}

export function kg(n: number): string {
  return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 3 }).format(
    Number.isFinite(n) ? n : 0,
  )} kg`;
}
