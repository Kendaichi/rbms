"use server";

import { createClient } from "@/lib/supabase/server";
import { orderSchema } from "@/lib/validation/order";

export type SubmitState = {
  ok: boolean;
  orderNo?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Storefront order placement. Calls the anon-callable place_order() RPC; no
// direct table writes (RLS forbids them) and no service-role key.
export async function submitOrder(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const d = parsed.data;
  const isDelivery = d.fulfillment === "delivery";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_name: d.name,
    p_contact: d.contact,
    p_address: isDelivery ? d.address || null : null,
    p_barangay: d.barangay || null,
    p_fulfillment: d.fulfillment,
    p_delivery_date: isDelivery ? d.deliveryDate || null : null,
    p_time_slot: isDelivery ? d.timeSlot || null : null,
    p_kg: d.kg,
    p_notes: d.notes || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, orderNo: typeof data === "string" ? data : String(data) };
}

export type TrackedOrder = {
  order_no: string;
  status: string;
  payment_status: string;
  order_date: string;
  fulfillment_type: string;
  delivery_address: string | null;
  delivery_date: string | null;
  time_slot: string | null;
  mill_by: string | null;
  kg_ordered: number;
  price_per_kg: number;
  rice_amount: number;
  delivery_fee: number;
  total_due: number;
  amount_paid: number;
  balance: number;
  milled_on: string | null;
  delivered_on: string | null;
  customer_name: string;
};

export type TrackState = {
  searched: boolean;
  order?: TrackedOrder;
  error?: string;
};

// Guest order tracking via the track_order() SECURITY DEFINER RPC (needs both
// the order number and the matching contact).
export async function trackOrder(
  _prev: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const orderNo = String(formData.get("orderNo") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  if (!orderNo || !contact) {
    return { searched: true, error: "Enter your order number and contact number." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_order", {
    p_order_no: orderNo,
    p_contact: contact,
  });

  if (error) return { searched: true, error: error.message };
  const rows = (data ?? []) as TrackedOrder[];
  if (rows.length === 0) {
    return {
      searched: true,
      error: "No order found. Check the order number and contact number.",
    };
  }
  return { searched: true, order: rows[0] };
}
