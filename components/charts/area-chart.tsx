"use client";

import { useId, useState } from "react";

type Point = { label: string; value: number };

// Single-series area + line for change-over-time (monthly sales). Hover a month
// band for a crosshair + value readout. Responsive via viewBox; strokes use
// non-scaling-stroke so they stay crisp at any width.
export function AreaChart({
  points,
  format = (n) => String(n),
  label = "Trend",
}: {
  points: Point[];
  format?: (n: number) => string;
  label?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const W = 680;
  const H = 240;
  const padL = 10;
  const padR = 10;
  const padT = 16;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${x(0)},${padT + innerH} ${line} ${x(points.length - 1)},${padT + innerH}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "auto" }}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* gridlines + y labels */}
      {[0, 0.5, 1].map((t) => {
        const gy = padT + innerH * (1 - t);
        return (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={gy}
              y2={gy}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={W - padR}
              y={gy - 4}
              textAnchor="end"
              style={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            >
              {format(max * t)}
            </text>
          </g>
        );
      })}

      <polygon points={area} fill={`url(#area-${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {hover !== null && (
        <line
          x1={x(hover)}
          x2={x(hover)}
          y1={padT}
          y2={padT + innerH}
          stroke="var(--muted-foreground)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      )}

      {points.map((p, i) => (
        <g key={i}>
          <text
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          >
            {p.label}
          </text>
          <circle
            cx={x(i)}
            cy={y(p.value)}
            r={hover === i ? 4.5 : 3}
            fill="var(--primary)"
            stroke="var(--card)"
            strokeWidth={1.5}
          />
          <rect
            x={x(i) - stepX / 2}
            y={padT}
            width={stepX}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        </g>
      ))}

      {hover !== null && (
        <g transform={`translate(${Math.min(Math.max(x(hover), 54), W - 54)}, ${Math.max(y(points[hover].value) - 14, 22)})`}>
          <rect
            x={-50}
            y={-20}
            width={100}
            height={34}
            rx={8}
            fill="var(--popover)"
            stroke="var(--border)"
          />
          <text x={0} y={-6} textAnchor="middle" style={{ fontSize: 10, fill: "var(--muted-foreground)" }}>
            {points[hover].label}
          </text>
          <text x={0} y={8} textAnchor="middle" style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}>
            {format(points[hover].value)}
          </text>
        </g>
      )}
    </svg>
  );
}
