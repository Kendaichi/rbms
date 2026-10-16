"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { AdminNav } from "./admin-nav";
import { AdminDataProvider } from "./admin-data-provider";
import { Toaster } from "@/components/ui/toaster";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-2.5">
      <LogoMark className="size-7" />
      <span className="text-[0.95rem] font-semibold tracking-tight">RBMS</span>
    </Link>
  );
}

function SignOutButton({ full }: { full?: boolean }) {
  return (
    <form action={signOut} className={full ? "w-full" : undefined}>
      <button
        type="submit"
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          full ? "w-full px-3 py-2" : "px-2.5 py-1.5",
        )}
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </form>
  );
}

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // The drawer closes on nav via AdminNav's onNavigate; here we just lock scroll
  // and wire Escape while it's open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <AdminNav />
        <div className="border-t p-2.5">
          <p className="truncate px-3 pt-1 pb-2 text-xs text-sidebar-foreground/50">
            {userName}
          </p>
          <SignOutButton full />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px] duration-150 animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-72 max-w-[82vw] flex-col border-r bg-sidebar text-sidebar-foreground duration-200 animate-in slide-in-from-left">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <AdminNav onNavigate={() => setOpen(false)} />
            <div className="border-t p-2.5">
              <p className="truncate px-3 pt-1 pb-2 text-xs text-sidebar-foreground/50">
                {userName}
              </p>
              <SignOutButton full />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="-ml-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <Brand />
          <SignOutButton />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <AdminDataProvider>{children}</AdminDataProvider>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
