"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { peso } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The one live thing (taste-skill): order by the kilo and watch the total.
// Uses the subject's real price; carries the chosen kilos into the order form.
const PRESETS = [10, 25, 50];

export function PriceCalculator({ pricePerKg }: { pricePerKg: number }) {
  const [kg, setKg] = useState(25);
  const clamp = (n: number) => Math.max(1, Math.min(9999, Math.round(n)));
  const total = kg * pricePerKg;

  return (
    <div className="rounded-2xl bg-card p-5 text-card-foreground sm:p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted-foreground">How many kilos?</p>
        <p className="text-sm text-muted-foreground">
          {peso(pricePerKg)} <span className="text-xs">/ kg</span>
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setKg((k) => clamp(k - 5))}
          aria-label="Fewer kilos"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-secondary"
        >
          <Minus className="size-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
          <input
            type="number"
            min={1}
            value={kg}
            onChange={(e) => setKg(clamp(Number(e.target.value) || 1))}
            className="w-20 bg-transparent text-center text-4xl font-semibold tracking-tight tabular-nums outline-none"
            aria-label="Kilograms"
          />
          <span className="text-lg text-muted-foreground">kg</span>
        </div>
        <button
          type="button"
          onClick={() => setKg((k) => clamp(k + 5))}
          aria-label="More kilos"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-secondary"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setKg(p)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              kg === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {p} kg
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-muted-foreground">Total</span>
        <span className="text-2xl font-semibold tabular-nums">{peso(total)}</span>
      </div>

      <Link
        href={`/order?kg=${kg}`}
        className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}
      >
        Order {kg} kg
      </Link>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Pay on delivery or pickup — no account needed.
      </p>
    </div>
  );
}
