"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addTransaction,
  postOrderSale,
  postBatchCosts,
  type FormState,
  type ActionResult,
} from "@/app/actions/books";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { peso, kg } from "@/lib/format";

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

type Account = {
  id: string;
  title: string;
  category: string;
  ref_prefix?: string | null;
};

export function AddEntryForm({
  accounts,
  nextRef,
}: {
  accounts: Account[];
  nextRef: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(addTransaction, initial);
  const e = state.fieldErrors ?? {};
  const [accountId, setAccountId] = useState("");
  const preview = accountId ? nextRef[accountId] : "";

  // Group accounts into <optgroup> by category.
  const groups = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={e.txn_date}>
          <Input type="date" name="txn_date" defaultValue={todayManila()} />
        </Field>
        <Field label="Ref / No.">
          <Input name="txn_no" placeholder={preview ? `Auto: ${preview}` : "Auto-assigned"} />
          <p className="text-xs text-muted-foreground">
            {preview
              ? `Leave blank to auto-number: ${preview}.`
              : "Leave blank to auto-number by account."}
          </p>
        </Field>
      </div>
      <Field label="Account" error={e.account_id}>
        <select
          name="account_id"
          value={accountId}
          onChange={(ev) => setAccountId(ev.target.value)}
          className={selectCls}
        >
          <option value="" disabled>
            — choose an account —
          </option>
          {Object.entries(groups).map(([cat, items]) => (
            <optgroup key={cat} label={cat}>
              {items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Particulars" error={e.particulars}>
        <Input name="particulars" placeholder="What is this entry for?" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₱)" error={e.amount}>
          <Input type="number" name="amount" min={0} step="0.01" />
        </Field>
        <Field label="Reference doc (optional)">
          <Input name="ref" placeholder="OR / invoice no." />
        </Field>
      </div>
      {state.ok && <p className="text-sm text-primary">Entry saved.</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add entry"}
      </Button>
    </form>
  );
}

function PostButton({
  onPost,
  label = "Post",
}: {
  onPost: () => Promise<ActionResult>;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center justify-end gap-2">
      {msg && <span className="text-xs text-destructive">{msg}</span>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await onPost();
            if (r?.error) setMsg(r.error);
          });
        }}
      >
        {pending ? "Posting…" : label}
      </Button>
    </div>
  );
}

type UnpostedOrder = {
  id: string;
  order_no: string;
  delivered_on: string | null;
  customer: string;
  rice_amount: number;
  balance: number;
};

export function PostOrdersPanel({ orders }: { orders: UnpostedOrder[] }) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No delivered orders waiting to be posted. Sales post here once an order
        is marked <span className="font-medium">Delivered</span>.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Order</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Delivered</th>
            <th className="px-3 py-2 text-right font-medium">Sale</th>
            <th className="px-3 py-2 text-right font-medium">Of which utang</th>
            <th className="px-3 py-2 text-right font-medium">Post</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{o.order_no}</td>
              <td className="px-3 py-2">{o.customer}</td>
              <td className="px-3 py-2">{o.delivered_on ?? "—"}</td>
              <td className="px-3 py-2 text-right">{peso(o.rice_amount)}</td>
              <td className="px-3 py-2 text-right">
                {o.balance > 0 ? peso(o.balance) : "—"}
              </td>
              <td className="px-3 py-2">
                <PostButton onPost={() => postOrderSale(o.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type UnpostedBatch = {
  id: string;
  purchase_date: string;
  supplier: string | null;
  kg_purchased: number;
  palay_cost: number;
  total_batch_cost: number;
};

export function PostBatchesPanel({ batches }: { batches: UnpostedBatch[] }) {
  if (batches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No palay batches waiting to be posted. Add a batch in{" "}
        <span className="font-medium">Inventory</span>, then post its purchase
        and processing costs here.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Supplier</th>
            <th className="px-3 py-2 text-right font-medium">Palay</th>
            <th className="px-3 py-2 text-right font-medium">Palay cost</th>
            <th className="px-3 py-2 text-right font-medium">Batch cost</th>
            <th className="px-3 py-2 text-right font-medium">Post</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="px-3 py-2">{b.purchase_date}</td>
              <td className="px-3 py-2">{b.supplier ?? "—"}</td>
              <td className="px-3 py-2 text-right">{kg(b.kg_purchased)}</td>
              <td className="px-3 py-2 text-right">{peso(b.palay_cost)}</td>
              <td className="px-3 py-2 text-right">{peso(b.total_batch_cost)}</td>
              <td className="px-3 py-2">
                <PostButton onPost={() => postBatchCosts(b.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
