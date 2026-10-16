"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight row-actions menu. The popup renders to <body> so it is never
// clipped by a scrolling table (craft-floor: overlays escape their container),
// flips above the trigger when there isn't room below, and closes on outside
// click, Escape, or scroll.

const MenuCtx = createContext<{ close: () => void }>({ close: () => {} });

export function DropdownMenu({
  children,
  trigger,
  align = "end",
  srLabel = "Open actions",
}: {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  align?: "start" | "end";
  srLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rect || !menuRef.current) return;
    const mw = menuRef.current.offsetWidth;
    const mh = menuRef.current.offsetHeight;
    let left = align === "end" ? rect.right - mw : rect.left;
    left = Math.min(Math.max(8, left), window.innerWidth - mw - 8);
    let top = rect.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, rect.top - 6 - mh);
    setPos({ top, left });
  }, [open, rect, align]);

  const toggle = () => {
    if (open) return setOpen(false);
    setRect(triggerRef.current?.getBoundingClientRect() ?? null);
    setPos({ top: -9999, left: -9999 });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-expanded:bg-muted aria-expanded:text-foreground"
      >
        {trigger ?? <MoreVertical className="size-4" />}
        <span className="sr-only">{srLabel}</span>
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 min-w-44 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-border/50 duration-100 animate-in fade-in zoom-in-95"
          >
            <MenuCtx.Provider value={{ close: () => setOpen(false) }}>
              {children}
            </MenuCtx.Provider>
          </div>,
          document.body,
        )}
    </>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon: Icon,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "destructive";
  disabled?: boolean;
}) {
  const { close } = useContext(MenuCtx);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        close();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-40",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10"
          : "hover:bg-muted",
      )}
    >
      {Icon && <Icon className="size-4 opacity-80" />}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  );
}
