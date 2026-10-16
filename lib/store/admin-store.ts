"use client";

import { create } from "zustand";

// One Zustand store holds the admin back-office data, one entry per table. It is
// hydrated once per session (see useCollection) and kept live by Realtime (see
// AdminDataProvider), so navigating between tabs reads from cache — no refetch.

export type CollectionName =
  | "orders"
  | "customers"
  | "palay_batches"
  | "milling_runs"
  | "transactions"
  | "accounts"
  | "ppe_items"
  | "monthly_inventory"
  | "settings"
  | "products";

export const COLLECTION_NAMES: CollectionName[] = [
  "orders",
  "customers",
  "palay_batches",
  "milling_runs",
  "transactions",
  "accounts",
  "ppe_items",
  "monthly_inventory",
  "settings",
  "products",
];

export type RowId = string | boolean;
export type Row = Record<string, unknown> & { id?: RowId };
export type LoadStatus = "idle" | "loading" | "ready" | "error";

export type CollectionState = {
  rows: Row[];
  status: LoadStatus;
  error?: string;
};

type AdminStore = {
  collections: Record<CollectionName, CollectionState>;
  setStatus: (name: CollectionName, status: LoadStatus, error?: string) => void;
  setRows: (name: CollectionName, rows: Row[]) => void;
  upsertRow: (name: CollectionName, row: Row) => void;
  removeRow: (name: CollectionName, id: RowId) => void;
  reset: () => void;
};

const emptyCollection = (): CollectionState => ({ rows: [], status: "idle" });

function initialCollections(): Record<CollectionName, CollectionState> {
  return COLLECTION_NAMES.reduce(
    (acc, n) => {
      acc[n] = emptyCollection();
      return acc;
    },
    {} as Record<CollectionName, CollectionState>,
  );
}

export const useAdminStore = create<AdminStore>((set) => ({
  collections: initialCollections(),

  setStatus: (name, status, error) =>
    set((s) => ({
      collections: {
        ...s.collections,
        [name]: { ...s.collections[name], status, error },
      },
    })),

  setRows: (name, rows) =>
    set((s) => ({
      collections: {
        ...s.collections,
        [name]: { rows, status: "ready", error: undefined },
      },
    })),

  // Insert or merge a row by id. Used by optimistic writes and Realtime events.
  // Keeps the rest of the row if Realtime only sends a partial image.
  upsertRow: (name, row) =>
    set((s) => {
      const col = s.collections[name];
      const idx = col.rows.findIndex((r) => r.id === row.id);
      const rows =
        idx === -1
          ? [row, ...col.rows]
          : col.rows.map((r, i) => (i === idx ? { ...r, ...row } : r));
      return { collections: { ...s.collections, [name]: { ...col, rows } } };
    }),

  removeRow: (name, id) =>
    set((s) => {
      const col = s.collections[name];
      return {
        collections: {
          ...s.collections,
          [name]: { ...col, rows: col.rows.filter((r) => r.id !== id) },
        },
      };
    }),

  reset: () => set({ collections: initialCollections() }),
}));
