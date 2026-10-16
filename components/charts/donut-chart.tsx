// Donut for the order-status mix. Part-to-whole with ≤4 labelled slices; every
// slice carries a legend swatch + value + percent (secondary encoding), so the
// validated status palette reads even under CVD. 2px surface gap between slices.
type Segment = { label: string; value: number; color: string };

const CX = 110;
const CY = 110;
const R_OUT = 100;
const R_IN = 66;

function polar(r: number, angle: number): [number, number] {
  const a = angle - Math.PI / 2;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function arc(a0: number, a1: number): string {
  const [x0, y0] = polar(R_OUT, a0);
  const [x1, y1] = polar(R_OUT, a1);
  const [x2, y2] = polar(R_IN, a1);
  const [x3, y3] = polar(R_IN, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0},${y0} A${R_OUT},${R_OUT} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${R_IN},${R_IN} 0 ${large} 0 ${x3},${y3} Z`;
}

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  format = (n) => String(n),
}: {
  segments: Segment[];
  centerValue: string;
  centerLabel: string;
  format?: (n: number) => string;
}) {
  const active = segments.filter((s) => s.value > 0);
  const total = active.reduce((s, x) => s + x.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <svg
        viewBox="0 0 220 220"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label={`${centerLabel}: ${centerValue}`}
      >
        {total === 0 && (
          <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--muted)" strokeWidth={R_OUT - R_IN} />
        )}
        {total > 0 && active.length === 1 && (
          <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke={active[0].color} strokeWidth={R_OUT - R_IN} />
        )}
        {total > 0 &&
          active.length > 1 &&
          (() => {
            let acc = 0;
            const gap = 0.03;
            return active.map((s) => {
              const a0 = (acc / total) * 2 * Math.PI + gap / 2;
              acc += s.value;
              const a1 = (acc / total) * 2 * Math.PI - gap / 2;
              return <path key={s.label} d={arc(a0, Math.max(a0, a1))} fill={s.color} />;
            });
          })()}
        <text x={CX} y={CY - 4} textAnchor="middle" style={{ fontSize: 30, fontWeight: 600, fill: "var(--foreground)" }}>
          {centerValue}
        </text>
        <text x={CX} y={CY + 18} textAnchor="middle" style={{ fontSize: 12, fill: "var(--muted-foreground)" }}>
          {centerLabel}
        </text>
      </svg>

      <ul className="w-full min-w-0 space-y-2 text-sm">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.label} className="flex items-center gap-2.5">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{format(s.value)}</span>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
