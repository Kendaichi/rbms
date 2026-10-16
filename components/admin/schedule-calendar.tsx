"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Wheat } from "lucide-react";
import { manilaToday } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { OrderRow } from "@/lib/store/selectors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const statusVar: Record<string, string> = {
  Pending: "--status-pending",
  Milled: "--status-milled",
  Delivered: "--status-delivered",
  Cancelled: "--status-cancelled",
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Month grid plotting deliveries by date (colored by status) and mill-by days
// (gold wheat marker). Cells link to the order. Built from the cached orders.
export function ScheduleCalendar({ orders }: { orders: OrderRow[] }) {
  const today = manilaToday();
  const [ty, tm] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: ty, m: tm });

  const byDay = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const o of orders) {
      if (o.status === "Cancelled" || !o.delivery_date) continue;
      const k = String(o.delivery_date);
      (map.get(k) ?? map.set(k, []).get(k)!).push(o);
    }
    return map;
  }, [orders]);

  const millDays = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      if ((o.status === "Pending" || o.status === "Milled") && o.mill_by) {
        s.add(String(o.mill_by));
      }
    }
    return s;
  }, [orders]);

  const first = new Date(cursor.y, cursor.m - 1, 1);
  const startDow = first.getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(cursor.y, cursor.m - 1, 1 - startDow + i);
    return { date: iso(d), day: d.getDate(), inMonth: d.getMonth() === cursor.m - 1 };
  });

  const monthLabel = first.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m - 1 + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor({ y: ty, m: tm })}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const events = byDay.get(c.date) ?? [];
          const isToday = c.date === today;
          const hasMill = millDays.has(c.date);
          return (
            <div
              key={c.date}
              className={cn(
                "min-h-14 rounded-lg border p-1 sm:min-h-20 sm:p-1.5",
                c.inMonth ? "bg-background" : "bg-muted/30",
                isToday && "ring-2 ring-primary ring-inset",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    c.inMonth ? "text-foreground" : "text-muted-foreground/50",
                    isToday && "font-semibold text-primary",
                  )}
                >
                  {c.day}
                </span>
                {hasMill && (
                  <Wheat className="size-3 text-brand-gold" aria-label="Mill-by day" />
                )}
              </div>

              {/* Desktop: labelled chips */}
              <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
                {events.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    title={`${o.order_no} · ${o.status}`}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight"
                    style={{
                      backgroundColor: `color-mix(in oklch, var(${statusVar[o.status]}) 16%, transparent)`,
                      color: `var(${statusVar[o.status]})`,
                    }}
                  >
                    {o.order_no}
                  </Link>
                ))}
                {events.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">+{events.length - 3} more</span>
                )}
              </div>

              {/* Mobile: dots */}
              {events.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                  {events.slice(0, 4).map((o) => (
                    <span
                      key={o.id}
                      className="size-1.5 rounded-full"
                      style={{ background: `var(${statusVar[o.status]})` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {(["Pending", "Milled", "Delivered"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: `var(${statusVar[s]})` }} />
            {s}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <Wheat className="size-3 text-brand-gold" />
          Mill-by
        </span>
      </div>
    </div>
  );
}
