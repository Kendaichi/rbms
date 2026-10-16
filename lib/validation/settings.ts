import { z } from "zod";

// Business-wide defaults (the singleton `settings` row). The selling price here
// is the storefront price AND the default frozen onto new orders; changing it
// never alters past orders (orders resolve-and-freeze price at write time).
export const settingsSchema = z.object({
  business_name: z.string().trim().min(1, "Enter a business name").max(120),
  default_price_per_kg: z.coerce
    .number()
    .positive("Enter a price greater than 0"),
  milling_recovery: z.coerce
    .number()
    .positive("Enter a recovery greater than 0")
    .max(1, "Recovery is rice per kg of palay (0–1)"),
  mill_days_before_delivery: z.coerce
    .number()
    .int("Whole days only")
    .min(0, "Cannot be negative"),
});
