"use client";

import { useActionState } from "react";
import { updateSettings, type FormState } from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initial: FormState = {};

export type SettingsValues = {
  business_name: string;
  default_price_per_kg: number;
  milling_recovery: number;
  mill_days_before_delivery: number;
};

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState(updateSettings, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="Business name" error={e.business_name}>
        <Input name="business_name" defaultValue={values.business_name} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Selling price (₱ / kg)"
          hint="Shown on the storefront and used as the default on new orders. Past orders keep their own frozen price."
          error={e.default_price_per_kg}
        >
          <Input
            type="number"
            name="default_price_per_kg"
            min={0}
            step="0.01"
            defaultValue={values.default_price_per_kg}
          />
        </Field>
        <Field
          label="Milling recovery (rice / palay)"
          hint="Kg of rice per kg of palay. Default 0.62."
          error={e.milling_recovery}
        >
          <Input
            type="number"
            name="milling_recovery"
            min={0}
            max={1}
            step="0.01"
            defaultValue={values.milling_recovery}
          />
        </Field>
      </div>

      <Field
        label="Mill days before delivery"
        hint="How many days before the delivery date the rice is milled (sets each order's mill-by date)."
        error={e.mill_days_before_delivery}
      >
        <Input
          type="number"
          name="mill_days_before_delivery"
          min={0}
          step="1"
          defaultValue={values.mill_days_before_delivery}
          className="sm:w-40"
        />
      </Field>

      {state.ok && <p className="text-sm text-primary">Settings saved.</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
