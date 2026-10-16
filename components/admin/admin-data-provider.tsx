"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  useAdminStore,
  COLLECTION_NAMES,
  type CollectionName,
  type Row,
} from "@/lib/store/admin-store";
import { fetchCollection } from "@/lib/store/useCollection";

// Mounted once in the admin layout. Because a layout does not remount when you
// navigate between its child routes, this provider — and its single Realtime
// channel + the Zustand cache it feeds — persists across tab switches. That is
// what makes navigation instant (no refetch) and keeps every open tab live.
export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();
    const store = useAdminStore.getState();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const applyChange = (
      name: CollectionName,
      payload: {
        eventType: "INSERT" | "UPDATE" | "DELETE";
        new: Record<string, unknown>;
        old: Record<string, unknown>;
      },
    ) => {
      if (payload.eventType === "DELETE") {
        const id = (payload.old as Row | undefined)?.id;
        if (id !== undefined) store.removeRow(name, id);
      } else {
        const row = payload.new as Row | undefined;
        if (row && row.id !== undefined) store.upsertRow(name, row);
      }
    };

    const start = async () => {
      // CRITICAL: authenticate the Realtime socket with the signed-in session
      // BEFORE subscribing. The admin tables are RLS staff-only, so an
      // unauthenticated (anon) socket receives no changes — which looks exactly
      // like "realtime isn't working". getSession() ensures the cookie session
      // is restored first; setAuth() hands the token to the websocket.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase.channel("rbms-admin-db-changes");
      for (const table of COLLECTION_NAMES) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) =>
            applyChange(
              table,
              payload as unknown as Parameters<typeof applyChange>[1],
            ),
        );
      }
      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Surface misconfig (RLS/publication/auth) instead of failing silently.
          console.warn(`[RBMS realtime] subscription ${status}`);
        }
      });
    };

    void start();

    // Keep the socket authenticated across token refreshes / re-logins.
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) void supabase.realtime.setAuth(session.access_token);
    });

    // Warm the collections most pages (and the dashboard) need right away;
    // the rest hydrate lazily on first visit via useCollection.
    void fetchCollection("orders");
    void fetchCollection("customers");
    void fetchCollection("settings");

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return <>{children}</>;
}
