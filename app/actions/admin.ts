"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reconcileOrderReceivable } from "@/lib/books/posting";
import { adminOrderSchema } from "@/lib/validation/admin-order";
import { customerSchema } from "@/lib/validation/customer";
import { manilaToday } from "@/lib/date";

export type ActionResult = { ok?: boolean; error?: string };
export type CustomerActionResult = ActionResult & {
  fieldErrors?: Record<string, string>;
  id?: string;
};
export type OrderActionResult = ActionResult & {
  fieldErrors?: Record<string, string>;
  orderNo?: string;
  id?: string;
};

const STATUSES = ["Pending", "Milled", "Delivered", "Cancelled"] as const;

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

function revalidateOrders(id?: string) {
  revalidatePath("/admin/orders");
  if (id) revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/deliveries");
  revalidatePath("/admin/customers");
}

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid status." };
  }
  const supabase = await createClient();
  const today = manilaToday();

  // Preserve the original milled date across an undo; clear stage timestamps
  // that no longer apply when moving a step backward.
  const { data: cur } = await supabase
    .from("orders")
    .select("milled_on")
    .eq("id", id)
    .maybeSingle();
  const existingMilled = (cur?.milled_on as string | null) ?? null;

  const patch: Record<string, unknown> = { status };
  if (status === "Milled") {
    patch.milled_on = existingMilled ?? today;
    patch.delivered_on = null;
  } else if (status === "Delivered") {
    patch.milled_on = existingMilled ?? today;
    patch.delivered_on = today;
  } else if (status === "Pending") {
    patch.milled_on = null;
    patch.delivered_on = null;
  }

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

// --------------------------------------------------------------------------
// Create an order from the back-office. Resolves (or creates) the customer,
// then inserts into orders — the orders_resolve() trigger assigns ORD-###,
// freezes mill_by and derives payment_status. source = 'admin'.
// --------------------------------------------------------------------------
export async function createOrder(values: unknown): Promise<OrderActionResult> {
  const parsed = adminOrderSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  let customerId: string | null = d.customer_id || null;
  if (!customerId) {
    const contact = d.customer_contact?.trim() || "";
    if (contact) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("contact_no", contact)
        .maybeSingle();
      customerId = existing?.id ?? null;
    }
    if (!customerId) {
      const { data: created, error: cErr } = await supabase
        .from("customers")
        .insert({
          name: d.customer_name?.trim() || "Walk-in",
          contact_no: contact || null,
          barangay: d.customer_barangay?.trim() || null,
          address: d.customer_address?.trim() || null,
        })
        .select("id")
        .single();
      if (cErr) return { error: cErr.message };
      customerId = created.id;
    }
  }

  const isDelivery = d.fulfillment_type === "delivery";
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      fulfillment_type: d.fulfillment_type,
      delivery_address: isDelivery ? d.delivery_address?.trim() || null : null,
      delivery_date: isDelivery ? d.delivery_date || null : null,
      time_slot: isDelivery ? d.time_slot || null : null,
      kg_ordered: d.kg_ordered,
      price_per_kg: d.price_per_kg,
      delivery_fee: d.delivery_fee,
      amount_paid: d.amount_paid,
      notes: d.notes?.trim() || null,
      source: "admin",
    })
    .select("id, order_no")
    .single();
  if (error) return { error: error.message };

  revalidateOrders(order.id);
  return { ok: true, orderNo: order.order_no, id: order.id };
}

// --------------------------------------------------------------------------
// Edit an order. Delivery details and notes are always editable; the financial
// fields (kg, price, fee, customer) only while the order is still Pending, so
// milled/delivered/posted figures never shift under the books.
// --------------------------------------------------------------------------
export async function updateOrder(
  id: string,
  values: unknown,
): Promise<OrderActionResult> {
  const parsed = adminOrderSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "Order not found." };

  const isDelivery = d.fulfillment_type === "delivery";
  const patch: Record<string, unknown> = {
    fulfillment_type: d.fulfillment_type,
    delivery_address: isDelivery ? d.delivery_address?.trim() || null : null,
    delivery_date: isDelivery ? d.delivery_date || null : null,
    time_slot: isDelivery ? d.time_slot || null : null,
    notes: d.notes?.trim() || null,
  };
  if (current.status === "Pending") {
    patch.kg_ordered = d.kg_ordered;
    patch.price_per_kg = d.price_per_kg;
    patch.delivery_fee = d.delivery_fee;
    if (d.customer_id) patch.customer_id = d.customer_id;
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) return { error: error.message };

  // Keep A/R aligned if the order's sale is already posted (no-op otherwise).
  await reconcileOrderReceivable(supabase, id);
  revalidateOrders(id);
  revalidatePath("/admin/books/balance-sheet");
  return { ok: true, id };
}

// --------------------------------------------------------------------------
// Delete an order — only if it has no posted books entry. A posted order must
// be Cancelled instead so the ledger/balance sheet stay intact.
// --------------------------------------------------------------------------
export async function deleteOrder(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: posted } = await supabase
    .from("transactions")
    .select("id")
    .eq("related_order_id", id)
    .limit(1);
  if (posted && posted.length > 0) {
    return {
      error: "This order has posted books entries — cancel it instead of deleting.",
    };
  }
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateOrders(id);
  return { ok: true };
}

// --------------------------------------------------------------------------
// Customers — create / edit / delete (staff only via RLS).
// --------------------------------------------------------------------------
export async function upsertCustomer(
  values: unknown,
  id?: string,
): Promise<CustomerActionResult> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const payload = {
    name: d.name.trim(),
    contact_no: d.contact_no?.trim() || null,
    barangay: d.barangay?.trim() || null,
    address: d.address?.trim() || null,
    customer_type: d.customer_type?.trim() || "Household",
    notes: d.notes?.trim() || null,
  };

  const res = id
    ? await supabase.from("customers").update(payload).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(payload).select("id").single();

  if (res.error) {
    const msg = res.error.message.includes("customers_contact_no_key")
      ? "Another customer already uses that contact number."
      : res.error.message;
    return { error: msg };
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { ok: true, id: res.data.id };
}

// Delete only when the customer has no orders (their orders would otherwise be
// orphaned). Otherwise keep the record.
export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_id", id)
    .limit(1);
  if (orders && orders.length > 0) {
    return {
      error: "This customer has orders — they can't be deleted.",
    };
  }
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/customers");
  return { ok: true };
}
