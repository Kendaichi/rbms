// Horizontal bars with direct value labels — the clearest form for ranked
// magnitude (top customers) or per-day counts (next-7 deliveries). Single
// series, so one hue and a direct label per bar (no legend, no tooltip needed).
export function BarChart({
  data,
  format = (n) => String(n),
  color = "var(--primary)",
  empty = "No data yet.",
}: {
  data: { label: string; value: number; hint?: string }[];
  format?: (n: number) => string;
  color?: string;
  empty?: string;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
              {format(d.value)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
