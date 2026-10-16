"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, type Toast } from "@/lib/store/toast";
import { cn } from "@/lib/utils";

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
const tone = {
  success: "text-primary",
  error: "text-destructive",
  info: "text-brand-gold",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = icons[toast.variant];
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(toast.id), 4200);
    return () => window.clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover px-3.5 py-3 text-sm text-popover-foreground shadow-lg ring-1 ring-border/50 duration-200 animate-in fade-in slide-in-from-bottom-2"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone[toast.variant])} />
      <p className="min-w-0 flex-1 break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="-mt-0.5 -mr-1 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

const subscribe = () => () => {};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  // Portals have no server markup; render only on the client so the first
  // client render matches the server (no hydration mismatch). useSyncExternalStore
  // returns false on the server and true on the client without a mount effect.
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!isClient || typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:bottom-0 sm:max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  );
}
