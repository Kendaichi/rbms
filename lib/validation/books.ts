import { z } from "zod";

// A manual journal entry (Books → Transactions). The account's cash_direction
// decides whether the amount is a cash-in or cash-out in the views.
export const transactionSchema = z.object({
  txn_date: z.string().min(1, "Pick a date"),
  account_id: z.string().uuid("Choose an account"),
  particulars: z.string().trim().min(1, "Describe the entry").max(200),
  amount: z.coerce.number().positive("Enter an amount greater than 0"),
  txn_no: z.string().trim().max(40).optional().or(z.literal("")),
  ref: z.string().trim().max(120).optional().or(z.literal("")),
});

// Owner's month-end count of unsold stock at cost (drives COGS: "Less ending
// inventory"). month is normalised to the first day of the month.
export const endingInventorySchema = z.object({
  month: z.string().min(1, "Pick a month"),
  ending_inventory_at_cost: z.coerce.number().min(0, "Cannot be negative"),
});
