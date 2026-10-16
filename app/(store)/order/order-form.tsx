"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitOrder, type SubmitState } from "@/app/actions/orders";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { peso } from "@/lib/format";
import { timeSlots } from "@/lib/validation/order";

const initialState: SubmitState = { ok: false };

function minDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2); // leave a day to mill before delivery
  return d.toISOString().slice(0, 10);
}

export function OrderForm({ pricePerKg }: { pricePerKg: number }) {
  const [state, action, pending] = useActionState(submitOrder, initialState);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [kgValue, setKgValue] = useState("25");

  if (state.ok && state.orderNo) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-xl text-primary">
          ✓
        </div>
        <h2 className="mt-3 text-lg font-semibold">Order placed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Save your order number — you&rsquo;ll need it to track your order.
        </p>
        <p className="mt-4 text-2xl font-bold tracking-tight text-brand-gold">
          {state.orderNo}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/track?no=${encodeURIComponent(state.orderNo)}`}
            className={buttonVariants()}
          >
            Track this order
          </Link>
          <a href="/order" className={buttonVariants({ variant: "outline" })}>
            Place another order
          </a>
        </div>
      </div>
    );
  }

  const kgNum = Number(kgValue) || 0;
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5">
      <Field label="Your name" error={err.name}>
        <Input name="name" autoComplete="name" aria-invalid={!!err.name} placeholder="Juan Dela Cruz" />
      </Field>

      <Field label="Contact number" error={err.contact}>
        <Input
          name="contact"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={!!err.contact}
          placeholder="09xx xxx xxxx"
        />
      </Field>

      <div className="space-y-1.5">
        <Label>How would you like to get it?</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["delivery", "pickup"] as const).map((opt) => (
            <label
              key={opt}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                fulfillment === opt
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <input
                type="radio"
                name="fulfillment"
                value={opt}
                checked={fulfillment === opt}
                onChange={() => setFulfillment(opt)}
                className="sr-only"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {fulfillment === "delivery" && (
        <>
          <Field label="Delivery address" error={err.address}>
            <Input
              name="address"
              autoComplete="street-address"
              aria-invalid={!!err.address}
              placeholder="House no., street"
            />
          </Field>
          <Field label="Barangay (optional)">
            <Input name="barangay" placeholder="Barangay" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery date" error={err.deliveryDate}>
              <Input
                type="date"
                name="deliveryDate"
                min={minDeliveryDate()}
                aria-invalid={!!err.deliveryDate}
              />
            </Field>
            <Field label="Time slot">
              <select
                name="timeSlot"
                defaultValue={timeSlots[0]}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("-", "–")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}

      <Field label="Kilograms of rice" error={err.kg}>
        <Input
          type="number"
          name="kg"
          min={1}
          step={1}
          value={kgValue}
          onChange={(e) => setKgValue(e.target.value)}
          aria-invalid={!!err.kg}
        />
      </Field>

      <Field label="Notes (optional)">
        <Textarea name="notes" rows={2} placeholder="Anything we should know?" />
      </Field>

      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
        <span className="text-muted-foreground">Estimated total</span>
        <span className="text-lg font-semibold">{peso(kgNum * pricePerKg)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        You pay on {fulfillment}. We&rsquo;ll contact you to confirm before milling.
      </p>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
