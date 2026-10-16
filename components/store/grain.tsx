// The rice grain — the storefront's single motif (taste-skill one-motif
// direction). Drawn in code, fills with currentColor so callers set the colour.
// Used as the hero mass, the step bullets, and section marks.

export function Grain({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox="0 0 24 60" className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      <path
        d="M12 1 C 19.5 13, 19.5 47, 12 59 C 4.5 47, 4.5 13, 12 1 Z"
        fill="currentColor"
      />
    </svg>
  );
}

// A fan of grains radiating from a point — the hero's large flat shape.
export function GrainBurst({ className }: { className?: string }) {
  const grains = [-54, -36, -18, 0, 18, 36, 54];
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
      <g transform="translate(120 128)">
        {grains.map((deg, i) => (
          <g key={deg} transform={`rotate(${deg}) translate(0 -58)`}>
            <path
              d="M0 -46 C 7 -34, 7 -2, 0 10 C -7 -2, -7 -34, 0 -46 Z"
              fill="currentColor"
              opacity={i % 2 === 0 ? 1 : 0.68}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
