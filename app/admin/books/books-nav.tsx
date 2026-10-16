"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/books", label: "Journal", exact: true },
  { href: "/admin/books/income-statement", label: "Income Statement" },
  { href: "/admin/books/balance-sheet", label: "Balance Sheet" },
  { href: "/admin/books/depreciation", label: "Depreciation" },
  { href: "/admin/books/year", label: "Year Summary" },
];

export function BooksNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b pb-px">
      {tabs.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
