"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  Package,
  Calculator,
  BookOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/costing", label: "Costing", icon: Calculator },
  { href: "/admin/books", label: "Books", icon: BookOpen },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
      {items.map((it) => {
        const active = path === it.href || path.startsWith(it.href + "/");
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground",
              )}
            />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
