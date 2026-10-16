import { z } from "zod";

export const timeSlots = ["Morning (8-12)", "Afternoon (1-5)"] as const;

export const orderSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name"),
    contact: z.string().trim().min(7, "Enter a valid contact number"),
    fulfillment: z.enum(["delivery", "pickup"]),
    address: z.string().trim().max(200).optional().or(z.literal("")),
    barangay: z.string().trim().max(120).optional().or(z.literal("")),
    deliveryDate: z.string().optional().or(z.literal("")),
    timeSlot: z.string().optional().or(z.literal("")),
    kg: z.coerce.number().positive("Enter kilos greater than 0").max(100000),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => d.fulfillment === "pickup" || !!d.address, {
    message: "Delivery address is required",
    path: ["address"],
  })
  .refine((d) => d.fulfillment === "pickup" || !!d.deliveryDate, {
    message: "Please choose a delivery date",
    path: ["deliveryDate"],
  });

export type OrderInput = z.infer<typeof orderSchema>;
