import { requireOwner } from "@/lib/supabase/roles";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { selectClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const LIMIT = 200;

// Audited tables → friendly labels (the audit_log stores raw table names).
const TABLE_LABEL: Record<string, string> = {
  orders: "Order",
  customers: "Customer",
  palay_batches: "Palay batch",
  milling_runs: "Milling run",
  transactions: "Journal entry",
  accounts: "Account",
  ppe_items: "PP&E item",
  monthly_inventory: "Monthly inventory",
  settings: "Settings",
  products: "Product",
  profiles: "User",
};

const ACTIONS = ["INSERT", "UPDATE", "DELETE"] as const;
const ACTION_LABEL: Record<string, string> = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
};

type Json = Record<string, unknown> | null;

type AuditRow = {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  actor_label: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  row_id: string | null;
  old_data: Json;
  new_data: Json;
  changed_fields: string[] | null;
};

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 48 ? s.slice(0, 47) + "…" : s;
}

const get = (o: Json, k: string): unknown =>
  o ? (o as Record<string, unknown>)[k] : undefined;

// A short identifier for the affected record (order no, name, etc.).
function recordLabel(data: Json, rowId: string | null): string {
  const id =
    (get(data, "order_no") as string) ||
    (get(data, "name") as string) ||
    (get(data, "title") as string) ||
    (get(data, "particulars") as string) ||
    "";
  if (id) return id;
  return rowId ? `#${rowId.slice(0, 8)}` : "";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; action?: string }>;
}) {
  await requireOwner();
  const { table, action } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);
  if (table && TABLE_LABEL[table]) query = query.eq("table_name", table);
  if (action && (ACTIONS as readonly string[]).includes(action)) {
    query = query.eq("action", action);
  }
  const { data } = await query;
  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every change across the system — who did it, when, and what changed.
          Records are append-only and can&rsquo;t be edited.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Record type</span>
          <select name="table" defaultValue={table ?? ""} className={selectClass}>
            <option value="">All</option>
            {Object.entries(TABLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Action</span>
          <select name="action" defaultValue={action ?? ""} className={selectClass}>
            <option value="">All</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Showing the latest {rows.length}
        {rows.length === LIMIT ? ` (max ${LIMIT})` : ""} entries.
      </p>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Who</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Record</th>
              <th className="px-4 py-2.5 font-medium">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No activity recorded yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const base = r.action === "DELETE" ? r.old_data : r.new_data;
              const changed = r.changed_fields ?? [];
              return (
                <tr key={r.id} className="bg-card align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {fmtWhen(r.occurred_at)}
                  </td>
                  <td className="px-4 py-3">{r.actor_label || "System"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        r.action === "INSERT"
                          ? "success"
                          : r.action === "DELETE"
                            ? "danger"
                            : "default"
                      }
                    >
                      {ACTION_LABEL[r.action]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {TABLE_LABEL[r.table_name] ?? r.table_name}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {recordLabel(base, r.row_id)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.action === "UPDATE" && changed.length > 0 ? (
                      <details>
                        <summary className="cursor-pointer text-muted-foreground">
                          {changed.length} field{changed.length > 1 ? "s" : ""}:{" "}
                          {changed.join(", ")}
                        </summary>
                        <div className="mt-2 space-y-1">
                          {changed.map((f) => (
                            <div key={f} className="text-xs">
                              <span className="font-medium">{f}</span>:{" "}
                              <span className="text-muted-foreground line-through">
                                {fmtValue(get(r.old_data, f))}
                              </span>{" "}
                              → <span>{fmtValue(get(r.new_data, f))}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <span className="text-muted-foreground">
                        {r.action === "INSERT" ? "Record created" : "Record deleted"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
