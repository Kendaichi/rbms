"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Wheat, Package } from "lucide-react";
import { useCollection, refetchCollections } from "@/lib/store/useCollection";
import { inventoryStats } from "@/lib/store/selectors";
import type { Row } from "@/lib/store/admin-store";
import type { OrderRow } from "@/lib/store/selectors";
import { peso, kg } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataState } from "@/components/admin/data-state";
import { TableSkeleton, StatRowSkeleton } from "@/components/admin/skeletons";
import { ResponsiveTable, type Column } from "@/components/admin/responsive-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { deleteBatch, deleteMilling } from "@/app/actions/inventory";
import { toast } from "@/lib/store/toast";
import { BatchForm, MillingForm } from "./inventory-forms";

type BatchRow = Row & { id: string };
type RunRow = Row & { id: string };
const n = (v: unknown) => Number(v ?? 0);
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

export default function InventoryPage() {
  const batches = useCollection<BatchRow>("palay_batches");
  const runs = useCollection<RunRow>("milling_runs");
  const orders = useCollection<OrderRow>("orders");

  const [batchForm, setBatchForm] = useState<{ open: boolean; row: BatchRow | null }>({ open: false, row: null });
  const [millForm, setMillForm] = useState<{ open: boolean; row: RunRow | null }>({ open: false, row: null });
  const [delBatch, setDelBatch] = useState<BatchRow | null>(null);
  const [delRun, setDelRun] = useState<RunRow | null>(null);

  const stats = useMemo(
    () => inventoryStats(batches.rows, runs.rows, orders.rows),
    [batches.rows, runs.rows, orders.rows],
  );

  // Actual palay-in / rice-out per batch, summed from its linked milling runs —
  // the source of the derived recovery and cost-per-kg-of-rice shown per batch.
  const byBatch = useMemo(() => {
    const m: Record<string, { palay: number; rice: number }> = {};
    for (const r of runs.rows) {
      const bid = r.batch_id ? String(r.batch_id) : null;
      if (!bid) continue;
      const e = (m[bid] ??= { palay: 0, rice: 0 });
      e.palay += n(r.palay_kg_milled);
      e.rice += n(r.rice_kg_produced);
    }
    return m;
  }, [runs.rows]);

  const batchOptions = useMemo(
    () =>
      batches.rows.map((b) => ({
        value: b.id,
        label: `${String(b.purchase_date ?? "")} · ${kg(n(b.kg_purchased))}`,
      })),
    [batches.rows],
  );

  const batchCols: Column<BatchRow>[] = [
    { key: "date", header: "Date", primary: true, cell: (b) => String(b.purchase_date ?? "—") },
    { key: "supplier", header: "Supplier", cell: (b) => String(b.supplier ?? "—") },
    {
      key: "sacks",
      header: "Sacks",
      align: "right",
      cell: (b) => (b.sacks === null || b.sacks === undefined || b.sacks === "" ? "—" : String(n(b.sacks))),
    },
    { key: "palay", header: "Palay kg", align: "right", cell: (b) => kg(n(b.kg_purchased)) },
    { key: "price", header: "Price/kg", align: "right", cell: (b) => peso(n(b.price_per_kg)) },
    { key: "cost", header: "Batch cost", align: "right", cell: (b) => peso(n(b.total_batch_cost)) },
    {
      key: "rice",
      header: "Rice milled",
      align: "right",
      cell: (b) => {
        const e = byBatch[b.id];
        return e && e.rice > 0 ? kg(e.rice) : "—";
      },
    },
    {
      key: "rec",
      header: "Recovery",
      align: "right",
      cell: (b) => {
        const e = byBatch[b.id];
        return e && e.palay > 0 ? pct(e.rice / e.palay) : "—";
      },
    },
    {
      key: "crice",
      header: "Cost/kg rice",
      align: "right",
      cell: (b) => {
        const e = byBatch[b.id];
        return e && e.rice > 0 ? peso(n(b.total_batch_cost) / e.rice) : "—";
      },
    },
  ];

  const runCols: Column<RunRow>[] = [
    { key: "date", header: "Date", primary: true, cell: (r) => String(r.run_date ?? "—") },
    { key: "palay", header: "Palay milled", align: "right", cell: (r) => kg(n(r.palay_kg_milled)) },
    { key: "rice", header: "Rice produced", align: "right", cell: (r) => kg(n(r.rice_kg_produced)) },
    { key: "notes", header: "Notes", cell: (r) => String(r.notes ?? "—") },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Inventory" description="Palay stock, batches and milling runs — live.">
        <Button variant="outline" onClick={() => setMillForm({ open: true, row: null })}>
          <Wheat className="size-4" />
          Record milling
        </Button>
        <Button onClick={() => setBatchForm({ open: true, row: null })}>
          <Plus className="size-4" />
          Add batch
        </Button>
      </PageHeader>

      <DataState
        loading={batches.loading || runs.loading}
        error={batches.error ?? runs.error}
        onRetry={() => {
          batches.refetch();
          runs.refetch();
        }}
        skeleton={<StatRowSkeleton count={6} />}
      >
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Palay on hand" value={kg(stats.palay_on_hand)} tone="money" icon={Package} />
          <StatCard label="Rice on hand" value={kg(stats.rice_on_hand)} tone="money" icon={Wheat} />
          <StatCard label="Palay bought" value={kg(stats.palay_bought)} />
          <StatCard label="Palay milled" value={kg(stats.palay_milled)} />
          <StatCard label="Rice milled" value={kg(stats.rice_milled)} />
          <StatCard label="Recovery" value={stats.palay_milled > 0 ? pct(stats.recovery) : "—"} />
        </div>
      </DataState>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Palay batches</h2>
        <DataState
          loading={batches.loading}
          error={batches.error}
          onRetry={batches.refetch}
          skeleton={<TableSkeleton rows={4} cols={6} />}
        >
          <ResponsiveTable
            columns={batchCols}
            rows={batches.rows}
            actions={(b) => (
              <DropdownMenu>
                <MenuItem icon={Pencil} onSelect={() => setBatchForm({ open: true, row: b })}>
                  Edit
                </MenuItem>
                <MenuItem icon={Trash2} variant="destructive" onSelect={() => setDelBatch(b)}>
                  Delete
                </MenuItem>
              </DropdownMenu>
            )}
            empty={<p className="text-sm text-muted-foreground">No palay batches yet.</p>}
          />
        </DataState>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Milling runs</h2>
        <DataState
          loading={runs.loading}
          error={runs.error}
          onRetry={runs.refetch}
          skeleton={<TableSkeleton rows={3} cols={4} />}
        >
          <ResponsiveTable
            columns={runCols}
            rows={runs.rows}
            actions={(r) => (
              <DropdownMenu>
                <MenuItem icon={Pencil} onSelect={() => setMillForm({ open: true, row: r })}>
                  Edit
                </MenuItem>
                <MenuItem icon={Trash2} variant="destructive" onSelect={() => setDelRun(r)}>
                  Delete
                </MenuItem>
              </DropdownMenu>
            )}
            empty={<p className="text-sm text-muted-foreground">No milling runs recorded yet.</p>}
          />
        </DataState>
      </section>

      {/* Dialogs */}
      {batchForm.open && (
        <BatchForm
          open
          onClose={() => setBatchForm({ open: false, row: null })}
          batch={batchForm.row}
        />
      )}
      {millForm.open && (
        <MillingForm
          open
          onClose={() => setMillForm({ open: false, row: null })}
          batches={batchOptions}
          run={millForm.row}
        />
      )}
      {delBatch && (
        <ConfirmDialog
          open
          onClose={() => setDelBatch(null)}
          title="Delete palay batch?"
          destructive
          confirmLabel="Delete batch"
          body="Batches linked to a milling run or posted to the books can't be deleted."
          onConfirm={async () => {
            const r = await deleteBatch(delBatch.id);
            if (r.error) {
              toast.error(r.error);
            } else {
              toast.success("Batch deleted");
              refetchCollections("palay_batches");
            }
          }}
        />
      )}
      {delRun && (
        <ConfirmDialog
          open
          onClose={() => setDelRun(null)}
          title="Delete milling run?"
          destructive
          confirmLabel="Delete run"
          body="This removes the run and updates palay/rice on hand."
          onConfirm={async () => {
            const r = await deleteMilling(delRun.id);
            if (r.error) {
              toast.error(r.error);
            } else {
              toast.success("Milling run deleted");
              refetchCollections("milling_runs");
            }
          }}
        />
      )}
    </div>
  );
}
