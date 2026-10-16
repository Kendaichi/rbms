"use client";

import { useActionState } from "react";
import {
  addPalayBatch,
  addMillingRun,
  type FormState,
} from "@/app/actions/inventory";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const initial: FormState = {};

function todayManila() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

const selectCls =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

export function AddBatchForm() {
  const [state, action, pending] = useActionState(addPalayBatch, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase date" error={e.purchase_date}>
          <Input type="date" name="purchase_date" defaultValue={todayManila()} />
        </Field>
        <Field label="Supplier (optional)">
          <Input name="supplier" placeholder="Farmer / supplier" />
        </Field>
        <Field label="Palay kg" error={e.kg_purchased}>
          <Input type="number" name="kg_purchased" min={0} step="0.001" placeholder="4118" />
        </Field>
        <Field label="Price / kg (₱)" error={e.price_per_kg}>
          <Input type="number" name="price_per_kg" min={0} step="0.01" placeholder="22" />
        </Field>
        <Field label="Milling method">
          <select name="milling_method" defaultValue="mill" className={selectCls}>
            <option value="mill">Pay a rice mill</option>
            <option value="own">Own mini miller</option>
          </select>
        </Field>
        <Field label="Recovery (rice/palay)" error={e.milling_recovery}>
          <Input
            type="number"
            name="milling_recovery"
            min={0}
            max={1}
            step="0.01"
            defaultValue="0.62"
          />
        </Field>
      </div>

      <p className="pt-1 text-xs font-medium text-muted-foreground">
        Batch costs (₱)
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Drying">
          <Input type="number" name="drying_cost" min={0} step="0.01" defaultValue="0" />
        </Field>
        <Field label="Milling">
          <Input type="number" name="milling_cost" min={0} step="0.01" defaultValue="0" />
        </Field>
        <Field label="Transport">
          <Input type="number" name="transport_cost" min={0} step="0.01" defaultValue="0" />
        </Field>
        <Field label="Packaging">
          <Input type="number" name="packaging_cost" min={0} step="0.01" defaultValue="0" />
        </Field>
        <Field label="Other">
          <Input type="number" name="other_cost" min={0} step="0.01" defaultValue="0" />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <Textarea name="notes" rows={2} />
      </Field>

      {state.ok && <p className="text-sm text-primary">Batch saved.</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add batch"}
      </Button>
    </form>
  );
}

export function AddMillingForm({
  batches,
}: {
  batches: { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(addMillingRun, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Run date" error={e.run_date}>
          <Input type="date" name="run_date" defaultValue={todayManila()} />
        </Field>
        <Field label="From batch (optional)">
          <select name="batch_id" defaultValue="" className={selectCls}>
            <option value="">— not linked —</option>
            {batches.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Palay milled (kg)" error={e.palay_kg_milled}>
          <Input type="number" name="palay_kg_milled" min={0} step="0.001" />
        </Field>
        <Field label="Rice produced (kg)" error={e.rice_kg_produced}>
          <Input type="number" name="rice_kg_produced" min={0} step="0.001" />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <Textarea name="notes" rows={2} />
      </Field>
      {state.ok && <p className="text-sm text-primary">Milling run recorded.</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Record milling"}
      </Button>
    </form>
  );
}
