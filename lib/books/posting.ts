// Shared, server-only books posting helpers. Not a "use server" module — these
// are plain functions imported by Server Actions (they take a Supabase client),
// so they are never exposed as callable action endpoints.
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function todayManila(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

// Look up chart-of-accounts ids by title. Returns a title → id map (missing
// titles are simply absent).
export async function getAccountIds(
  supabase: ServerClient,
  titles: string[],
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("accounts")
    .select("id, title")
    .in("title", titles);
  const map: Record<string, string> = {};
  for (const a of data ?? []) map[a.title as string] = a.id as string;
  return map;
}

// Reconcile the Accounts Receivable (utang) posted for an order to its current
// outstanding balance. Only acts once the order's Sales row is posted. Posts an
// "Accounts Receivable - Collected" row when the customer has paid down the
// utang, or an additional "Accounts Receivable - Unpaid Sale" row if the
// receivable needs to grow (e.g. a payment was reversed). Idempotent: if the
// books already match the balance it posts nothing.
export async function reconcileOrderReceivable(
  supabase: ServerClient,
  orderId: string,
): Promise<{ error?: string }> {
  const { data: order } = await supabase
    .from("orders")
    .select("order_no, total_due, amount_paid")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return {};

  const ids = await getAccountIds(supabase, [
    "Sales",
    "Accounts Receivable - Unpaid Sale",
    "Accounts Receivable - Collected",
  ]);
  const salesId = ids["Sales"];
  const unpaidId = ids["Accounts Receivable - Unpaid Sale"];
  const collectedId = ids["Accounts Receivable - Collected"];
  if (!salesId || !unpaidId || !collectedId) {
    return { error: "Chart of accounts is missing Sales / A-R titles." };
  }

  // Only reconcile once the sale itself has been posted.
  const { data: sale } = await supabase
    .from("transactions")
    .select("id")
    .eq("related_order_id", orderId)
    .eq("account_id", salesId)
    .limit(1);
  if (!sale || sale.length === 0) return {};

  const { data: arRows } = await supabase
    .from("transactions")
    .select("amount, account_id")
    .eq("related_order_id", orderId)
    .in("account_id", [unpaidId, collectedId]);

  let unpaidSum = 0;
  let collectedSum = 0;
  for (const r of arRows ?? []) {
    if (r.account_id === unpaidId) unpaidSum += Number(r.amount);
    else if (r.account_id === collectedId) collectedSum += Number(r.amount);
  }
  const outstanding = round2(unpaidSum - collectedSum);
  const needed = round2(
    Math.max(0, Number(order.total_due) - Number(order.amount_paid)),
  );
  const delta = round2(outstanding - needed);

  const date = todayManila();
  const orderNo = (order.order_no as string) ?? "";
  if (delta > 0.005) {
    // Customer paid down the utang → record a collection.
    const { error } = await supabase.from("transactions").insert({
      txn_date: date,
      txn_no: orderNo,
      particulars: `Collected utang on ${orderNo}`,
      account_id: collectedId,
      amount: delta,
      related_order_id: orderId,
    });
    if (error) return { error: error.message };
  } else if (delta < -0.005) {
    // Receivable grew (e.g. payment reversed) → add back the utang.
    const { error } = await supabase.from("transactions").insert({
      txn_date: date,
      txn_no: orderNo,
      particulars: `Utang (unpaid) on ${orderNo}`,
      account_id: unpaidId,
      amount: round2(-delta),
      related_order_id: orderId,
    });
    if (error) return { error: error.message };
  }
  return {};
}
