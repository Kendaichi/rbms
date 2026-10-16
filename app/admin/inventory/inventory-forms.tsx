"use client";

import { useState, useTransition } from "react";
import { saveBatch, saveMilling } from "@/app/actions/inventory";
import { refetchCollections } from "@/lib/store/useCollection";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/ui/field";
import { manilaToday } from "@/lib/date";
import { toast } from "@/lib/store/toast";

type BatchRow = Record<string, unknown> & { id: string };
type RunRow = Record<string, unknown> & { id: string };

const s = (v: unknown, fallback = "") => (v === null || v === undefined ? fallback : String(v));

export function BatchForm({
  open,
  onClose,
  batch,
}: {
  open: boolean;
  onClose: () => void;
  batch?: BatchRow | null;
}) {
  const editing = !!batch;
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [f, setF] = useState({
    purchase_date: s(batch?.purchase_date, manilaToday()),
    supplier: s(batch?.supplier),
    kg_purchased: s(batch?.kg_purchased),
    price_per_kg: s(batch?.price_per_kg),
    milling_method: s(batch?.milling_method, "mill"),
    milling_recovery: s(batch?.milling_recovery, "0.62"),
    drying_cost: s(batch?.drying_cost, "0"),
    milling_cost: s(batch?.milling_cost, "0"),
    transport_cost: s(batch?.transport_cost, "0"),
    packaging_cost: s(batch?.packaging_cost, "0"),
    other_cost: s(batch?.other_cost, "0"),
    notes: s(batch?.notes),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    setErrors({});
    start(async () => {
      const r = await saveBatch(f, batch?.id);
      if (r.fieldErrors) setErrors(r.fieldErrors);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(editing ? "Batch updated" : "Batch added");
      refetchCollections("palay_batches");
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit palay batch" : "Add palay batch"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add batch"}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase date" error={errors.purchase_date}>
            <Input type="date" value={f.purchase_date} onChange={set("purchase_date")} />
          </Field>
          <Field label="Supplier">
            <Input value={f.supplier} onChange={set("supplier")} placeholder="Farmer / supplier" />
          </Field>
          <Field label="Palay kg" error={errors.kg_purchased}>
            <Input type="number" min={0} step="0.001" value={f.kg_purchased} onChange={set("kg_purchased")} placeholder="4118" />
          </Field>
          <Field label="Price / kg (₱)" error={errors.price_per_kg}>
            <Input type="number" min={0} step="0.01" value={f.price_per_kg} onChange={set("price_per_kg")} placeholder="22" />
          </Field>
          <Field label="Milling method">
            <select className={selectClass} value={f.milling_method} onChange={set("milling_method")}>
              <option value="mill">Pay a rice mill</option>
              <option value="own">Own mini miller</option>
            </select>
          </Field>
          <Field label="Recovery (rice/palay)" error={errors.milling_recovery}>
            <Input type="number" min={0} max={1} step="0.01" value={f.milling_recovery} onChange={set("milling_recovery")} />
          </Field>
        </div>

        <p className="pt-1 text-xs font-medium text-muted-foreground">Batch costs (₱)</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Drying"><Input type="number" min={0} step="0.01" value={f.drying_cost} onChange={set("drying_cost")} /></Field>
          <Field label="Milling"><Input type="number" min={0} step="0.01" value={f.milling_cost} onChange={set("milling_cost")} /></Field>
          <Field label="Transport"><Input type="number" min={0} step="0.01" value={f.transport_cost} onChange={set("transport_cost")} /></Field>
          <Field label="Packaging"><Input type="number" min={0} step="0.01" value={f.packaging_cost} onChange={set("packaging_cost")} /></Field>
          <Field label="Other"><Input type="number" min={0} step="0.01" value={f.other_cost} onChange={set("other_cost")} /></Field>
        </div>
        <Field label="Notes"><Textarea value={f.notes} onChange={set("notes")} rows={2} /></Field>
      </form>
    </Dialog>
  );
}

export function MillingForm({
  open,
  onClose,
  batches,
  run,
}: {
  open: boolean;
  onClose: () => void;
  batches: { value: string; label: string }[];
  run?: RunRow | null;
}) {
  const editing = !!run;
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({
    run_date: s(run?.run_date, manilaToday()),
    batch_id: s(run?.batch_id),
    palay_kg_milled: s(run?.palay_kg_milled),
    rice_kg_produced: s(run?.rice_kg_produced),
    notes: s(run?.notes),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    setErrors({});
    start(async () => {
      const r = await saveMilling(f, run?.id);
      if (r.fieldErrors) setErrors(r.fieldErrors);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(editing ? "Milling run updated" : "Milling run recorded");
      refetchCollections("milling_runs");
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit milling run" : "Record milling run"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Record milling"}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Run date" error={errors.run_date}>
            <Input type="date" value={f.run_date} onChange={set("run_date")} />
          </Field>
          <Field label="From batch">
            <select className={selectClass} value={f.batch_id} onChange={set("batch_id")}>
              <option value="">— not linked —</option>
              {batches.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Palay milled (kg)" error={errors.palay_kg_milled}>
            <Input type="number" min={0} step="0.001" value={f.palay_kg_milled} onChange={set("palay_kg_milled")} />
          </Field>
          <Field label="Rice produced (kg)" error={errors.rice_kg_produced}>
            <Input type="number" min={0} step="0.001" value={f.rice_kg_produced} onChange={set("rice_kg_produced")} />
          </Field>
        </div>
        <Field label="Notes"><Textarea value={f.notes} onChange={set("notes")} rows={2} /></Field>
      </form>
    </Dialog>
  );
}
