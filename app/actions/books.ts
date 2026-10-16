"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema, endingInventorySchema } from "@/lib/validation/books";
import {
  getAccountIds,
  reconcileOrderReceivable,
  round2,
  todayManila,
} from "@/lib/books/posting";

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type ActionResult = { ok?: boolean; error?: string };

function issuesToMap(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0]?.toString() ?? "form";
    if (!m[k]) m[k] = i.message;
  }
  return m;
}

function revalidateBooks() {
  revalidatePath("/admin/books");
  revalidatePath("/admin/books/income-statement");
  revalidatePath("/admin/books/balance-sheet");
  revalidatePath("/admin/books/year");
  revalidatePath("/admin/dashboard");
}

// --------------------------------------------------------------------------
// Manual journal entry.
// --------------------------------------------------------------------------
export async function addTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    txn_date: d.txn_date,
    account_id: d.account_id,
    particulars: d.particulars,
    amount: d.amount,
    txn_no: d.txn_no || null,
    ref: d.ref || null,
  });
  if (error) return { error: error.message };

  revalidateBooks();
  return { ok: true };
}

// --------------------------------------------------------------------------
// Month-end ending inventory (at cost). Drives COGS. One row per month.
// --------------------------------------------------------------------------
export async function setEndingInventory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = endingInventorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  // Normalise to the first day of the month (the table's unique key).
  const month = `${d.month.slice(0, 7)}-01`;
  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_inventory")
    .upsert(
      { month, ending_inventory_at_cost: d.ending_inventory_at_cost },
      { onConflict: "month" },
    );
  if (error) return { error: error.message };

  revalidateBooks();
  return { ok: true };
}

// --------------------------------------------------------------------------
// Owner-confirmed auto-posting: a delivered order → the books.
// Revenue is recognised on delivery (rice handed over). Posts a Sales row for
// the rice amount and (if charged) a delivery-fee row to Other Income, then
// reconciles Accounts Receivable to the order's balance via the shared helper
// so cash reflects only what was collected and the balance sheet stays
// balanced. Idempotent: a Sales row already linked to the order blocks a
// second post.
// --------------------------------------------------------------------------
export async function postOrderSale(orderId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select(
      "id, order_no, status, delivered_on, rice_amount, delivery_fee, customers(name)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (oErr) return { error: oErr.message };
  if (!order) return { error: "Order not found." };
  if (order.status !== "Delivered") {
    return { error: "Only delivered orders can be posted to the books." };
  }

  const ids = await getAccountIds(supabase, ["Sales", "Other Income"]);
  const salesId = ids["Sales"];
  const otherIncomeId = ids["Other Income"];
  if (!salesId) {
    return { error: "Chart of accounts is missing the Sales title." };
  }

  // Idempotency — already posted?
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("related_order_id", orderId)
    .eq("account_id", salesId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: "This sale is already posted." };
  }

  const customer =
    (order.customers as { name?: string } | { name?: string }[] | null) ?? null;
  const customerName = Array.isArray(customer)
    ? customer[0]?.name
    : customer?.name;

  const rice = round2(Number(order.rice_amount));
  const fee = round2(Number(order.delivery_fee ?? 0));
  const date = order.delivered_on ?? todayManila();

  const rows: Record<string, unknown>[] = [
    {
      txn_date: date,
      txn_no: order.order_no,
      particulars: `Sale ${order.order_no}${customerName ? ` — ${customerName}` : ""}`,
      account_id: salesId,
      amount: rice,
      related_order_id: orderId,
    },
  ];
  if (fee > 0 && otherIncomeId) {
    rows.push({
      txn_date: date,
      txn_no: order.order_no,
      particulars: `Delivery fee ${order.order_no}`,
      account_id: otherIncomeId,
      amount: fee,
      related_order_id: orderId,
    });
  }

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return { error: error.message };

  // Post the Accounts Receivable (utang) for any unpaid balance.
  const rec = await reconcileOrderReceivable(supabase, orderId);
  if (rec.error) return { error: rec.error };

  revalidateBooks();
  return { ok: true };
}

// --------------------------------------------------------------------------
// Owner-confirmed auto-posting: a palay batch → the books. Posts Purchases of
// Palay plus one row per non-zero processing cost (drying, milling, transport,
// packaging, other). Idempotent via a Purchases row linked to the batch.
// --------------------------------------------------------------------------
export async function postBatchCosts(batchId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: batch, error: bErr } = await supabase
    .from("palay_batches")
    .select(
      "id, purchase_date, supplier, palay_cost, drying_cost, milling_cost, transport_cost, packaging_cost, other_cost",
    )
    .eq("id", batchId)
    .maybeSingle();
  if (bErr) return { error: bErr.message };
  if (!batch) return { error: "Batch not found." };

  const costMap: { title: string; amount: number }[] = [
    { title: "Purchases of Palay", amount: Number(batch.palay_cost) },
    { title: "Drying Cost", amount: Number(batch.drying_cost) },
    { title: "Milling/Processing Costs", amount: Number(batch.milling_cost) },
    {
      title: "Transpo Costs (Hauling to Mill/Warehouse)",
      amount: Number(batch.transport_cost),
    },
    { title: "Packaging Costs", amount: Number(batch.packaging_cost) },
    { title: "Other Processing Charges", amount: Number(batch.other_cost) },
  ].filter((c) => c.amount > 0);

  const { data: accounts, error: aErr } = await supabase
    .from("accounts")
    .select("id, title")
    .in(
      "title",
      costMap.map((c) => c.title),
    );
  if (aErr) return { error: aErr.message };
  const acctId = (title: string) =>
    accounts?.find((a) => a.title === title)?.id;

  const purchasesId = acctId("Purchases of Palay");
  if (!purchasesId) {
    return { error: "Chart of accounts is missing Purchases of Palay." };
  }

  // Idempotency — already posted?
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("related_batch_id", batchId)
    .eq("account_id", purchasesId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: "This batch is already posted." };
  }

  const supplier = batch.supplier ? ` (${batch.supplier})` : "";
  const rows: Record<string, unknown>[] = [];
  for (const c of costMap) {
    const id = acctId(c.title);
    if (!id) continue;
    rows.push({
      txn_date: batch.purchase_date,
      particulars: `${c.title}${supplier}`,
      account_id: id,
      amount: round2(c.amount),
      related_batch_id: batchId,
    });
  }
  if (rows.length === 0) return { error: "Nothing to post for this batch." };

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return { error: error.message };

  revalidateBooks();
  return { ok: true };
}

// --------------------------------------------------------------------------
// Edit a manual journal entry. Auto-posted rows (linked to an order or batch)
// are immutable here — delete to un-post them instead.
// --------------------------------------------------------------------------
export async function updateTransaction(
  id: string,
  values: unknown,
): Promise<FormState> {
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("transactions")
    .select("related_order_id, related_batch_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Entry not found." };
  if (row.related_order_id || row.related_batch_id) {
    return { error: "Auto-posted entries can't be edited — delete to un-post." };
  }
  const d = parsed.data;
  const { error } = await supabase
    .from("transactions")
    .update({
      txn_date: d.txn_date,
      account_id: d.account_id,
      particulars: d.particulars,
      amount: d.amount,
      txn_no: d.txn_no || null,
      ref: d.ref || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateBooks();
  return { ok: true };
}

// --------------------------------------------------------------------------
// Delete a journal entry. If it was an order's Sales / A-R row, re-reconcile
// that order's receivable afterward (deleting the Sales row un-posts the sale)
// so the balance sheet stays consistent.
// --------------------------------------------------------------------------
export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("transactions")
    .select("related_order_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  if (row?.related_order_id) {
    await reconcileOrderReceivable(supabase, row.related_order_id);
  }
  revalidateBooks();
  return { ok: true };
}
