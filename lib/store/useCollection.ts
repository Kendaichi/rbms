"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  useAdminStore,
  type CollectionName,
  type Row,
} from "./admin-store";

// Per-table fetch config. We select "*" (stored generated columns like
// total_due / balance / palay_to_mill_kg come back too) and deliberately DO NOT
// embed joins — related rows (e.g. a customer name) are resolved from their own
// cached collection so Realtime patches never drop joined data.
type QueryConfig = { orderBy?: string; ascending?: boolean };

const QUERIES: Record<CollectionName, QueryConfig> = {
  orders: { orderBy: "order_date", ascending: false },
  customers: { orderBy: "created_at", ascending: false },
  palay_batches: { orderBy: "purchase_date", ascending: false },
  milling_runs: { orderBy: "run_date", ascending: false },
  transactions: { orderBy: "txn_date", ascending: false },
  accounts: { orderBy: "sort_order", ascending: true },
  ppe_items: { orderBy: "purchase_date", ascending: true },
  monthly_inventory: { orderBy: "month", ascending: false },
  settings: {},
  products: { orderBy: "created_at", ascending: true },
};

// Guard against duplicate concurrent fetches (StrictMode double-mount, two
// components asking for the same collection in one render).
const inFlight = new Set<CollectionName>();

function selectAll(name: CollectionName) {
  const supabase = createClient();
  const q = QUERIES[name];
  const query = supabase.from(name).select("*");
  return q.orderBy
    ? query.order(q.orderBy, { ascending: q.ascending ?? false })
    : query;
}

export async function fetchCollection(name: CollectionName, force = false) {
  const store = useAdminStore.getState();
  const current = store.collections[name];
  if (!force && (current.status === "ready" || current.status === "loading")) {
    return;
  }
  if (inFlight.has(name)) return;

  inFlight.add(name);
  store.setStatus(name, "loading");
  try {
    const { data, error } = await selectAll(name);
    if (error) store.setStatus(name, "error", error.message);
    else store.setRows(name, (data ?? []) as Row[]);
  } catch (e) {
    store.setStatus(
      name,
      "error",
      e instanceof Error ? e.message : "Failed to load data.",
    );
  } finally {
    inFlight.delete(name);
  }
}

// Background refresh: updates rows WITHOUT flipping to a loading skeleton. Used
// as a safety net right after a successful write so the acting tab reflects the
// change immediately even if its Realtime event is slow or dropped. Errors are
// ignored — the current data stays on screen and Realtime/next fetch reconciles.
export async function backgroundRefetch(name: CollectionName) {
  if (inFlight.has(name)) return;
  inFlight.add(name);
  try {
    const { data, error } = await selectAll(name);
    if (!error) useAdminStore.getState().setRows(name, (data ?? []) as Row[]);
  } catch {
    // ignore — keep showing the last good data
  } finally {
    inFlight.delete(name);
  }
}

export function refetchCollections(...names: CollectionName[]) {
  for (const n of names) void backgroundRefetch(n);
}

export type UseCollectionResult<T> = {
  rows: T[];
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  loading: boolean;
  ready: boolean;
  refetch: () => Promise<void>;
};

// Read a collection from the cache; fetch once on first use. Cached thereafter
// and refreshed live by Realtime, so revisiting the tab is instant.
export function useCollection<T = Row>(
  name: CollectionName,
): UseCollectionResult<T> {
  const col = useAdminStore((s) => s.collections[name]);

  useEffect(() => {
    if (col.status === "idle") void fetchCollection(name);
  }, [name, col.status]);

  return {
    rows: col.rows as T[],
    status: col.status,
    error: col.error,
    loading: col.status === "idle" || col.status === "loading",
    ready: col.status === "ready",
    refetch: () => fetchCollection(name, true),
  };
}
