import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One table definition that renders as a real table on md+ and as stacked,
// labeled cards on phones — so every admin list is usable on mobile without
// horizontal scrolling. The `primary` column becomes each card's heading.
export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  primary?: boolean;
  headerClassName?: string;
  cellClassName?: string;
};

const alignCls = (a?: string) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

export function ResponsiveTable<T extends { id: string }>({
  columns,
  rows,
  actions,
  empty,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  actions?: (row: T) => ReactNode;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
        {empty ?? <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
      </div>
    );
  }

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-3 py-2.5 font-medium", alignCls(c.align), c.headerClassName)}
                >
                  {c.header}
                </th>
              ))}
              {actions && <th className="w-10 px-2 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b transition-colors last:border-0 hover:bg-muted/30",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn("px-3 py-2.5 align-middle", alignCls(c.align), c.cellClassName)}
                  >
                    {c.cell(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-xl border bg-card p-4",
              onRowClick && "cursor-pointer active:bg-muted/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm font-medium">{primary.cell(row)}</div>
              {actions && (
                <div className="-mt-1 -mr-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {actions(row)}
                </div>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm tabular-nums">
              {rest.map((c) => (
                <div key={c.key} className={cn(c.align === "right" && "text-right")}>
                  <dt className="text-xs text-muted-foreground">{c.header}</dt>
                  <dd className="mt-0.5">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
