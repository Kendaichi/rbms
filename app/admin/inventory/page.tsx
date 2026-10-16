import { createClient } from "@/lib/supabase/server";
import { peso, kg } from "@/lib/format";
import { AddBatchForm, AddMillingForm } from "./inventory-forms";

type Batch = {
  id: string;
  purchase_date: string;
  supplier: string | null;
  kg_purchased: number;
  price_per_kg: number;
  milling_method: string;
  total_batch_cost: number;
  expected_rice_kg: number;
  cost_per_kg_rice: number;
};
type Run = {
  id: string;
  run_date: string;
  palay_kg_milled: number;
  rice_kg_produced: number;
  notes: string | null;
};

function n(v: unknown) {
  return Number(v ?? 0);
}

function Tile({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          big
            ? "mt-1 text-2xl font-semibold text-primary"
            : "mt-1 text-xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default async function InventoryPage() {
  const supabase = await createClient();
  const [{ data: inv }, { data: batchesData }, { data: runsData }] =
    await Promise.all([
      supabase.from("inventory_summary").select("*").maybeSingle(),
      supabase
        .from("palay_batches")
        .select(
          "id, purchase_date, supplier, kg_purchased, price_per_kg, milling_method, total_batch_cost, expected_rice_kg, cost_per_kg_rice",
        )
        .order("purchase_date", { ascending: false }),
      supabase
        .from("milling_runs")
        .select("id, run_date, palay_kg_milled, rice_kg_produced, notes")
        .order("run_date", { ascending: false }),
    ]);

  const batches = (batchesData ?? []) as unknown as Batch[];
  const runs = (runsData ?? []) as unknown as Run[];
  const batchOptions = batches.map((b) => ({
    value: b.id,
    label: `${b.purchase_date} · ${kg(n(b.kg_purchased))}`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Palay stock, batches and milling runs.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Palay on hand" value={kg(n(inv?.palay_on_hand))} big />
        <Tile label="Rice on hand" value={kg(n(inv?.rice_on_hand))} big />
        <Tile label="Palay bought" value={kg(n(inv?.palay_bought))} />
        <Tile label="Palay milled" value={kg(n(inv?.palay_milled))} />
        <Tile label="Rice milled" value={kg(n(inv?.rice_milled))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Add palay batch</h2>
          <div className="rounded-xl border bg-card p-4">
            <AddBatchForm />
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Record milling run</h2>
          <div className="rounded-xl border bg-card p-4">
            <AddMillingForm batches={batchOptions} />
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Palay batches</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 text-right font-medium">Palay kg</th>
                <th className="px-3 py-2 text-right font-medium">Price/kg</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 text-right font-medium">Batch cost</th>
                <th className="px-3 py-2 text-right font-medium">Exp. rice</th>
                <th className="px-3 py-2 text-right font-medium">Cost/kg rice</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2">{b.purchase_date}</td>
                  <td className="px-3 py-2">{b.supplier ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{kg(n(b.kg_purchased))}</td>
                  <td className="px-3 py-2 text-right">{peso(n(b.price_per_kg))}</td>
                  <td className="px-3 py-2">
                    {b.milling_method === "own" ? "Own miller" : "Rice mill"}
                  </td>
                  <td className="px-3 py-2 text-right">{peso(n(b.total_batch_cost))}</td>
                  <td className="px-3 py-2 text-right">{kg(n(b.expected_rice_kg))}</td>
                  <td className="px-3 py-2 text-right">{peso(n(b.cost_per_kg_rice))}</td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    No palay batches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Milling runs</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Palay milled</th>
                <th className="px-3 py-2 text-right font-medium">Rice produced</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2">{r.run_date}</td>
                  <td className="px-3 py-2 text-right">{kg(n(r.palay_kg_milled))}</td>
                  <td className="px-3 py-2 text-right">{kg(n(r.rice_kg_produced))}</td>
                  <td className="px-3 py-2">{r.notes ?? "—"}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No milling runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
