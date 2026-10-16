"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";
export type Toast = { id: number; message: string; variant: ToastVariant };

type ToastStore = {
  toasts: Toast[];
  push: (message: string, variant: ToastVariant) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, variant) =>
    set((s) => ({ toasts: [...s.toasts, { id: nextId++, message, variant }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Fire-and-forget helpers usable from anywhere (actions callbacks, handlers).
export const toast = {
  success: (m: string) => useToastStore.getState().push(m, "success"),
  error: (m: string) => useToastStore.getState().push(m, "error"),
  info: (m: string) => useToastStore.getState().push(m, "info"),
};
