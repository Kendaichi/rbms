import { z } from "zod";

export const CUSTOMER_TYPES = ["Household", "Reseller", "Business"] as const;

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  contact_no: z.string().trim().max(40).optional().or(z.literal("")),
  barangay: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  customer_type: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
