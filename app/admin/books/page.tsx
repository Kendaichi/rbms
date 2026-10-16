import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import {
  AddEntryForm,
  PostOrdersPanel,
  PostBatchesPanel,
} from "./journal-forms";
import { TransactionRowActions } from "./transaction-row-actions";

type Txn = {
  id: string;
  txn_date: string;
  txn_no: string | null;
  particulars: string | null;
  amount: number;
  ref: string | null;
  account_id: string;
  related_order_id: string | null;
  related_batch_id: string | null;
  accounts: { title: string; category: string; cash_direction: string } | null;
};

function n(v: unknown) {
  return Number(v ?? 0);
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "in" | "out" | "net";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "in"
            ? "mt-1 text-2xl font-semibold text-primary"
            : tone === "out"
              ? "mt-1 text-2xl font-semibold text-destructive"
              : "mt-1 text-2xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default async function JournalPage() {
  const supabase = await createClient();
  const [
    { data: txnData },
    { data: acctData },
    { data: orderData },
    { data: batchData },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, txn_date, txn_no, particulars, amount, ref, account_id, related_order_id, related_batch_id, accounts(title, category, cash_direction)",
      )
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, title, category, sort_order, ref_prefix")
      .order("sort_order", { ascending: true }),
    supabase
      .from("orders")
      .select(
        "id, order_no, delivered_on, rice_amount, balance, customers(name)",
      )
      .eq("status", "Delivered")
      .order("delivered_on", { ascending: false }),
    supabase
      .from("palay_batches")
      .select(
        "id, purchase_date, supplier, kg_purchased, palay_cost, total_batch_cost",
      )
      .order("purchase_date", { ascending: false }),
  ]);

  const txns = (txnData ?? []) as unknown as Txn[];
  const accounts = (acctData ?? []) as unknown as {
    id: string;
    title: string;
    category: string;
    ref_prefix: string | null;
  }[];

  // Preview the next auto ref per account (mirrors the DB trigger's next_txn_no):
  // prefix + zero-padded (max existing numeric suffix + 1).
  const nextRef: Record<string, string> = {};
  for (const a of accounts) {
    const prefix = a.ref_prefix;
    if (!prefix) continue;
    let max = 0;
    for (const t of txns) {
      const no = t.txn_no;
      if (!no || !no.startsWith(prefix)) continue;
      const rest = no.slice(prefix.length);
      if (/^\d+$/.test(rest)) max = Math.max(max, parseInt(rest, 10));
    }
    nextRef[a.id] = `${prefix}${String(max + 1).padStart(2, "0")}`;
  }

  // Which orders / batches are already posted?
  const postedOrders = new Set(
    txns
      .filter((t) => t.related_order_id && t.accounts?.title === "Sales")
      .map((t) => t.related_order_id as string),
  );
  const postedBatches = new Set(
    txns
      .filter(
        (t) => t.related_batch_id && t.accounts?.title === "Purchases of Palay",
      )
      .map((t) => t.related_batch_id as string),
  );

  type OrderRow = {
    id: string;
    order_no: string;
    delivered_on: string | null;
    rice_amount: number;
    balance: number;
    customers: { name?: string } | { name?: string }[] | null;
  };
  const unpostedOrders = ((orderData ?? []) as unknown as OrderRow[])
    .filter((o) => !postedOrders.has(o.id))
    .map((o) => {
      const c = Array.isArray(o.customers) ? o.customers[0] : o.customers;
      return {
        id: o.id,
        order_no: o.order_no,
        delivered_on: o.delivered_on,
        customer: c?.name ?? "—",
        rice_amount: n(o.rice_amount),
        balance: n(o.balance),
      };
    });

  type BatchRow = {
    id: string;
    purchase_date: string;
    supplier: string | null;
    kg_purchased: number;
    palay_cost: number;
    total_batch_cost: number;
  };
  const unpostedBatches = ((batchData ?? []) as unknown as BatchRow[])
    .filter((b) => !postedBatches.has(b.id))
    .map((b) => ({
      id: b.id,
      purchase_date: b.purchase_date,
      supplier: b.supplier,
      kg_purchased: n(b.kg_purchased),
      palay_cost: n(b.palay_cost),
      total_batch_cost: n(b.total_batch_cost),
    }));

  const totalIn = txns
    .filter((t) => t.accounts?.cash_direction === "IN")
    .reduce((s, t) => s + n(t.amount), 0);
  const totalOut = txns
    .filter((t) => t.accounts?.cash_direction === "OUT")
    .reduce((s, t) => s + n(t.amount), 0);
  const net = totalIn - totalOut;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Cash in" value={peso(totalIn)} tone="in" />
        <Tile label="Cash out" value={peso(totalOut)} tone="out" />
        <Tile label="Net cash" value={peso(net)} tone="net" />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Add journal entry</h2>
          <div className="rounded-xl border bg-card p-4">
            <AddEntryForm accounts={accounts} nextRef={nextRef} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">
              Post sales from delivered orders
            </h2>
            <PostOrdersPanel orders={unpostedOrders} />
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">
              Post costs from palay batches
            </h2>
            <PostBatchesPanel batches={unpostedBatches} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Transactions{" "}
          <span className="font-normal text-muted-foreground">
            ({txns.length})
          </span>
        </h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Ref</th>
                <th className="px-3 py-2 font-medium">Particulars</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 text-right font-medium">Cash in</th>
                <th className="px-3 py-2 text-right font-medium">Cash out</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const isIn = t.accounts?.cash_direction === "IN";
                const isAuto = !!(t.related_order_id || t.related_batch_id);
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2 whitespace-nowrap">{t.txn_date}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {t.txn_no ?? "—"}
                    </td>
                    <td className="px-3 py-2">{t.particulars ?? "—"}</td>
                    <td className="px-3 py-2">{t.accounts?.title ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-primary">
                      {isIn ? peso(n(t.amount)) : ""}
                    </td>
                    <td className="px-3 py-2 text-right text-destructive">
                      {!isIn ? peso(n(t.amount)) : ""}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <TransactionRowActions
                        txn={{
                          id: t.id,
                          txn_date: t.txn_date,
                          txn_no: t.txn_no,
                          particulars: t.particulars,
                          amount: n(t.amount),
                          ref: t.ref,
                          account_id: t.account_id,
                          isAuto,
                        }}
                        accounts={accounts}
                      />
                    </td>
                  </tr>
                );
              })}
              {txns.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
            {txns.length > 0 && (
              <tfoot className="border-t bg-muted/30 text-sm font-medium">
                <tr>
                  <td className="px-3 py-2" colSpan={4}>
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right text-primary">
                    {peso(totalIn)}
                  </td>
                  <td className="px-3 py-2 text-right text-destructive">
                    {peso(totalOut)}
                  </td>
                  <td className="px-2 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}
