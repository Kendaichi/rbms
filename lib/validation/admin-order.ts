import { z } from "zod";

// Staff order create/edit. A staff order either targets an existing customer
// (customer_id) or carries inline new-customer details. Price is editable and
// written explicitly (resolve-and-freeze), not left for the trigger to default.
export const adminOrderSchema = z
  .object({
    customer_id: z.string().uuid().optional().or(z.literal("")),
    customer_name: z.string().trim().max(120).optional().or(z.literal("")),
    customer_contact: z.string().trim().max(40).optional().or(z.literal("")),
    customer_barangay: z.string().trim().max(120).optional().or(z.literal("")),
    customer_address: z.string().trim().max(200).optional().or(z.literal("")),

    kg_ordered: z.coerce.number().positive("Enter kilos greater than 0").max(100000),
    price_per_kg: z.coerce.number().positive("Enter a price per kg"),
    fulfillment_type: z.enum(["delivery", "pickup"]),
    delivery_date: z.string().optional().or(z.literal("")),
    time_slot: z.string().optional().or(z.literal("")),
    delivery_address: z.string().trim().max(200).optional().or(z.literal("")),
    delivery_fee: z.coerce.number().min(0).default(0),
    amount_paid: z.coerce.number().min(0).default(0),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    (d) => !!d.customer_id || (d.customer_name?.trim().length ?? 0) >= 2,
    { message: "Choose a customer or enter a name", path: ["customer_name"] },
  )
  .refine((d) => d.fulfillment_type === "pickup" || !!d.delivery_date, {
    message: "Pick a delivery date",
    path: ["delivery_date"],
  })
  .refine(
    (d) => d.fulfillment_type === "pickup" || !!d.delivery_address?.trim(),
    { message: "Enter a delivery address", path: ["delivery_address"] },
  );

export type AdminOrderInput = z.infer<typeof adminOrderSchema>;
