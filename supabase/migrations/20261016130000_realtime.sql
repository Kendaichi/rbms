-- RBMS — Milestone 9: enable Supabase Realtime for the admin client cache.
-- The admin back-office hydrates a browser-side Zustand cache once per session
-- and keeps it live via Realtime. Realtime enforces the same RLS as table reads,
-- so only staff sessions receive changes; anon/customer sessions get nothing.
-- Append-only: does not touch any shipped migration or seed.sql.

-- Add the admin tables to the default supabase_realtime publication. Guarded so
-- re-running (or a table already published) is a no-op.
do $$
declare t text;
begin
  foreach t in array array[
    'orders','customers','palay_batches','milling_runs','transactions',
    'accounts','ppe_items','monthly_inventory','settings','products'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Full row images on UPDATE/DELETE so change payloads always carry enough to
-- patch the client cache (the row id on delete, the full new row on update).
alter table public.orders            replica identity full;
alter table public.customers         replica identity full;
alter table public.palay_batches     replica identity full;
alter table public.milling_runs      replica identity full;
alter table public.transactions      replica identity full;
alter table public.accounts          replica identity full;
alter table public.ppe_items         replica identity full;
alter table public.monthly_inventory replica identity full;
alter table public.settings          replica identity full;
alter table public.products          replica identity full;
