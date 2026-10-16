"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", ready: true },
  { href: "/admin/orders", label: "Orders", ready: true },
  { href: "/admin/customers", label: "Customers", ready: true },
  { href: "/admin/deliveries", label: "Deliveries", ready: true },
  { href: "/admin/inventory", label: "Inventory", ready: true },
  { href: "/admin/costing", label: "Costing", ready: true },
  { href: "/admin/books", label: "Books", ready: true },
  { href: "/admin/settings", label: "Settings", ready: true },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2">
      {items.map((it) =>
        it.ready ? (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              path === it.href || path.startsWith(it.href + "/")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            {it.label}
          </Link>
        ) : (
          <span
            key={it.href}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-foreground/40"
          >
            {it.label}
            <span className="text-[10px] font-medium uppercase tracking-wide">
              soon
            </span>
          </span>
        ),
      )}
    </nav>
  );
}
