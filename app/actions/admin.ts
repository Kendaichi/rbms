"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reconcileOrderReceivable } from "@/lib/books/posting";

export type ActionResult = { ok?: boolean; error?: string };

const STATUSES = ["Pending", "Milled", "Delivered", "Cancelled"] as const;

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid status." };
  }
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const patch: Record<string, unknown> = { status };
  if (status === "Milled") patch.milled_on = today;
  if (status === "Delivered") patch.delivered_on = today;

  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function recordPayment(
  id: string,
  amountPaid: number,
): Promise<ActionResult> {
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    return { error: "Enter a valid amount." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ amount_paid: amountPaid })
    .eq("id", id);
  if (error) return { error: error.message };

  // If the order's sale is already posted to the books, keep its Accounts
  // Receivable in sync with the new balance (best effort — a payment is still
  // recorded even if the books reconcile fails; the owner can journal it).
  await reconcileOrderReceivable(supabase, id);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/books");
  revalidatePath("/admin/books/balance-sheet");
  return { ok: true };
}
