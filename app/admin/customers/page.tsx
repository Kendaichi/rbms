"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useCollection, refetchCollections } from "@/lib/store/useCollection";
import {
  customerRollups,
  type CustomerRollup,
  type CustomerRow,
  type OrderRow,
} from "@/lib/store/selectors";
import { peso, kg } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { DataState } from "@/components/admin/data-state";
import { TableSkeleton } from "@/components/admin/skeletons";
import { ResponsiveTable, type Column } from "@/components/admin/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { deleteCustomer } from "@/app/actions/admin";
import { toast } from "@/lib/store/toast";
import { CustomerForm } from "./customer-form";

export default function CustomersPage() {
  const customers = useCollection<CustomerRow>("customers");
  const orders = useCollection<OrderRow>("orders");

  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomerRollup | null>(null);
  const [deleting, setDeleting] = useState<CustomerRollup | null>(null);

  const rows = useMemo(
    () => customerRollups(customers.rows, orders.rows),
    [customers.rows, orders.rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) =>
      (b.last_order ?? "").localeCompare(a.last_order ?? ""),
    );
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.contact_no ?? "").toLowerCase().includes(q) ||
        (c.barangay ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const columns: Column<CustomerRollup>[] = [
    {
      key: "name",
      header: "Name",
      primary: true,
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{c.name}</span>
          {c.customer_type !== "Household" && (
            <Badge variant="muted" className="font-normal">{c.customer_type}</Badge>
          )}
        </div>
      ),
    },
    { key: "contact", header: "Contact", cell: (c) => c.contact_no ?? "—" },
    { key: "barangay", header: "Barangay", cell: (c) => c.barangay ?? "—" },
    { key: "orders", header: "Orders", align: "right", cell: (c) => c.no_of_orders },
    { key: "kg", header: "Total kg", align: "right", cell: (c) => kg(c.total_kg) },
    { key: "spent", header: "Spent", align: "right", cell: (c) => peso(c.total_spent) },
    {
      key: "unpaid",
      header: "Unpaid",
      align: "right",
      cell: (c) =>
        c.unpaid_balance > 0 ? (
          <span className="font-medium text-destructive">{peso(c.unpaid_balance)}</span>
        ) : (
          peso(0)
        ),
    },
    { key: "last", header: "Last order", cell: (c) => c.last_order ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" description="Totals update live from orders.">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New customer
        </Button>
      </PageHeader>

      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, contact, barangay…"
          className="pl-8"
        />
      </div>

      <DataState
        loading={customers.loading}
        error={customers.error}
        onRetry={customers.refetch}
        skeleton={<TableSkeleton rows={6} cols={6} />}
      >
        <ResponsiveTable
          columns={columns}
          rows={filtered}
          actions={(c) => (
            <DropdownMenu>
              <MenuItem icon={Pencil} onSelect={() => setEditing(c)}>
                Edit
              </MenuItem>
              <MenuItem
                icon={Trash2}
                variant="destructive"
                onSelect={() => setDeleting(c)}
              >
                Delete
              </MenuItem>
            </DropdownMenu>
          )}
          empty={
            <div className="space-y-2">
              <p className="text-sm font-medium">No customers yet</p>
              <p className="text-sm text-muted-foreground">
                Customers are created automatically with online orders, or add one here.
              </p>
            </div>
          }
        />
      </DataState>

      <CustomerForm open={creating} onClose={() => setCreating(false)} />
      {editing && (
        <CustomerForm open onClose={() => setEditing(null)} customer={editing} />
      )}
      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          destructive
          confirmLabel="Delete customer"
          body="Customers with existing orders can't be deleted. This can't be undone."
          onConfirm={async () => {
            const r = await deleteCustomer(deleting.id);
            if (r.error) {
              toast.error(r.error);
            } else {
              toast.success(`${deleting.name} deleted`);
              refetchCollections("customers");
            }
          }}
        />
      )}
    </div>
  );
}
