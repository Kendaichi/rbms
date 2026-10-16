import { cn } from "@/lib/utils";

// The grain seal, drawn adaptively: the disc is `currentColor` and the rice
// grain is negative space, so the mark reads correctly on any brand surface
// (cream, sage, dark, or the forest-green bands) by inheriting the text colour.
// Gold ring + sprout are the fixed accent; the mill-split crease is the detail.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Freshly Milled Rice"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 128 A124 124 0 1 1 252 128 A124 124 0 1 1 4 128 Z
           M128 74 C 157 110, 157 170, 128 192 C 99 170, 99 110, 128 74 Z"
      />
      <path d="M128 96 L128 178" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="128" cy="128" r="110" fill="none" stroke="#EBB21F" strokeWidth="6" />
      <path d="M128 74 C 128 58, 134 50, 146 46" fill="none" stroke="#EBB21F" strokeWidth="7" strokeLinecap="round" />
      <path d="M146 46 C 139 45, 133 47, 130 53 C 137 55, 143 53, 146 46 Z" fill="#EBB21F" />
    </svg>
  );
}

export function LogoLockup({
  label = "RBMS",
  className,
  markClassName = "size-7",
  labelClassName = "text-[0.95rem] font-semibold tracking-tight",
}: {
  label?: string;
  className?: string;
  markClassName?: string;
  labelClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className={labelClassName}>{label}</span>
    </span>
  );
}
