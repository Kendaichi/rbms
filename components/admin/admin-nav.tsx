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
  UserCog,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { canAccessPage, type PageKey } from "@/lib/admin/pages";
import { cn } from "@/lib/utils";

const items: { page: PageKey; label: string; icon: LucideIcon }[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "orders", label: "Orders", icon: ClipboardList },
  { page: "customers", label: "Customers", icon: Users },
  { page: "deliveries", label: "Deliveries", icon: Truck },
  { page: "inventory", label: "Inventory", icon: Package },
  { page: "costing", label: "Costing", icon: Calculator },
  { page: "books", label: "Books", icon: BookOpen },
  { page: "users", label: "Users", icon: UserCog },
  { page: "audit", label: "Audit log", icon: ScrollText },
  { page: "settings", label: "Settings", icon: Settings },
];

export function AdminNav({
  role,
  pageAccess,
  onNavigate,
}: {
  role: "owner" | "staff";
  pageAccess: string[];
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const visible = items.filter((it) => canAccessPage(role, pageAccess, it.page));
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
      {visible.map((it) => {
        const href = `/admin/${it.page}`;
        const active = path === href || path.startsWith(href + "/");
        const Icon = it.icon;
        return (
          <Link
            key={it.page}
            href={href}
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
