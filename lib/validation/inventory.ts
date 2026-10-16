import { z } from "zod";

const money = z.coerce.number().min(0).default(0);

// Optional non-negative number that treats a blank input as "not provided".
const optionalNum = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0).optional(),
);

export const batchSchema = z.object({
  purchase_date: z.string().min(1, "Pick a date"),
  supplier: z.string().trim().max(120).optional().or(z.literal("")),
  sacks: optionalNum,
  kg_purchased: z.coerce.number().positive("Enter kilos greater than 0"),
  price_per_kg: z.coerce.number().positive("Enter a price"),
  drying_cost: money,
  milling_cost: money,
  transport_cost: money,
  packaging_cost: money,
  other_cost: money,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const millingSchema = z.object({
  run_date: z.string().min(1, "Pick a date"),
  batch_id: z.string().uuid().optional().or(z.literal("")),
  palay_kg_milled: z.coerce.number().min(0),
  rice_kg_produced: z.coerce.number().min(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
