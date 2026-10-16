// Pure selectors that derive the dashboard/customer/inventory figures the SQL
// views compute (dashboard_summary, inventory_summary, customer_summary), but
// from the cached base collections so they stay live and still match the
// spreadsheet oracle. Keep these in lock-step with supabase/migrations/…views.sql.

import type { Row } from "./admin-store";
import { manilaToday, addDays, startOfMonth, monthLabel } from "@/lib/date";

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const sum = (rows: Row[], key: string): number =>
  rows.reduce((a, r) => a + num(r[key]), 0);

export type OrderRow = {
  id: string;
  order_no: string;
  customer_id: string | null;
  order_date: string;
  delivery_date: string | null;
  mill_by: string | null;
  time_slot: string | null;
  fulfillment_type: string;
  delivery_address: string | null;
  status: string;
  payment_status: string;
  kg_ordered: number;
  price_per_kg: number;
  rice_amount: number;
  delivery_fee: number;
  total_due: number;
  amount_paid: number;
  balance: number;
  palay_to_mill_kg: number;
  milled_on: string | null;
  delivered_on: string | null;
  source: string;
  notes: string | null;
};

export type CustomerRow = {
  id: string;
  name: string;
  contact_no: string | null;
  address: string | null;
  barangay: string | null;
  customer_type: string;
  notes: string | null;
};

export type CustomerRollup = CustomerRow & {
  no_of_orders: number;
  total_kg: number;
  total_spent: number;
  unpaid_balance: number;
  last_order: string | null;
};

// --- dashboard_summary (all order-derived) -------------------------------
export function dashboardStats(orders: Row[]) {
  const today = manilaToday();
  const tomorrow = addDays(today, 1);
  const plus7 = addDays(today, 7);
  const active = orders.filter((o) => o.status !== "Cancelled");
  const pending = orders.filter((o) => o.status === "Pending");
  const dateOf = (o: Row) => (o.delivery_date ? String(o.delivery_date) : null);

  return {
    pending_orders: pending.length,
    rice_to_mill_pending: sum(pending, "kg_ordered"),
    palay_to_mill_pending: sum(pending, "palay_to_mill_kg"),
    active_orders: active.length,
    total_kg: sum(active, "kg_ordered"),
    total_sales: sum(active, "total_due"),
    collected: sum(active, "amount_paid"),
    unpaid_balance: sum(active, "balance"),
    overdue_deliveries: orders.filter(
      (o) =>
        o.status !== "Cancelled" &&
        o.status !== "Delivered" &&
        dateOf(o) &&
        String(o.delivery_date) < today,
    ).length,
    deliveries_today: active.filter((o) => dateOf(o) === today).length,
    deliveries_tomorrow: active.filter((o) => dateOf(o) === tomorrow).length,
    deliveries_next_7: active.filter((o) => {
      const d = dateOf(o);
      return d !== null && d >= today && d <= plus7;
    }).length,
  };
}

// --- inventory_summary ---------------------------------------------------
export function inventoryStats(batches: Row[], runs: Row[], orders: Row[]) {
  const palay_bought = sum(batches, "kg_purchased");
  const palay_milled = sum(runs, "palay_kg_milled");
  const rice_milled = sum(runs, "rice_kg_produced");
  const delivered_kg = sum(
    orders.filter((o) => o.status === "Delivered"),
    "kg_ordered",
  );
  return {
    palay_bought,
    palay_milled,
    palay_on_hand: palay_bought - palay_milled,
    rice_milled,
    rice_on_hand: rice_milled - delivered_kg,
    // Actual recovery, derived from milling runs (not a planned batch figure).
    recovery: palay_milled > 0 ? rice_milled / palay_milled : 0,
  };
}

// --- customer_summary ----------------------------------------------------
export function customerRollups(
  customers: Row[],
  orders: Row[],
): CustomerRollup[] {
  const byCustomer = new Map<string, Row[]>();
  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    const cid = o.customer_id ? String(o.customer_id) : null;
    if (!cid) continue;
    const list = byCustomer.get(cid) ?? [];
    list.push(o);
    byCustomer.set(cid, list);
  }
  return (customers as unknown as CustomerRow[]).map((c) => {
    const os = byCustomer.get(c.id) ?? [];
    const last = os.reduce<string | null>((max, o) => {
      const d = o.order_date ? String(o.order_date) : null;
      return d && (!max || d > max) ? d : max;
    }, null);
    return {
      ...c,
      no_of_orders: os.length,
      total_kg: sum(os, "kg_ordered"),
      total_spent: sum(os, "total_due"),
      unpaid_balance: sum(os, "balance"),
      last_order: last,
    };
  });
}

export function customerName(
  customers: Row[],
  id: string | null | undefined,
): string {
  if (!id) return "—";
  const c = customers.find((x) => x.id === id) as CustomerRow | undefined;
  return c?.name ?? "—";
}

// --- chart series --------------------------------------------------------
export type MonthPoint = { key: string; label: string; sales: number; orders: number };

// Sales + order count per month for the last `months`, order_date based.
export function monthlySales(orders: Row[], months = 6): MonthPoint[] {
  const today = manilaToday();
  const buckets: MonthPoint[] = [];
  const [y, m] = today.split("-").map(Number);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: monthLabel(key), sales: 0, orders: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const o of orders) {
    if (o.status === "Cancelled" || !o.order_date) continue;
    const key = startOfMonth(String(o.order_date)).slice(0, 7);
    const i = index.get(key);
    if (i === undefined) continue;
    buckets[i].sales += num(o.total_due);
    buckets[i].orders += 1;
  }
  return buckets;
}

export const ORDER_STATUSES = ["Pending", "Milled", "Delivered", "Cancelled"] as const;

export function statusCounts(orders: Row[]): { label: string; value: number }[] {
  return ORDER_STATUSES.map((s) => ({
    label: s,
    value: orders.filter((o) => o.status === s).length,
  }));
}

export function topCustomers(
  customers: Row[],
  orders: Row[],
  n = 5,
): { label: string; value: number }[] {
  return customerRollups(customers, orders)
    .filter((c) => c.total_spent > 0)
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, n)
    .map((c) => ({ label: c.name, value: c.total_spent }));
}

// Deliveries count per day for the next 7 days (today → +6), schedule view.
export function deliveriesNext7(orders: Row[]): { label: string; value: number; date: string }[] {
  const today = manilaToday();
  const out: { label: string; value: number; date: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const label = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "short",
    });
    const value = orders.filter(
      (o) => o.status !== "Cancelled" && o.delivery_date === date,
    ).length;
    out.push({ label, value, date });
  }
  return out;
}
