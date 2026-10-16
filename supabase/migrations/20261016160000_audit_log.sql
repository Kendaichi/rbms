-- RBMS — Full auditable system log.
-- A generic AFTER trigger on every business table writes an append-only row to
-- audit_log on each INSERT / UPDATE / DELETE, capturing who (auth.uid + their
-- profile name), when, which table/row, the before/after snapshots and (for
-- updates) the changed columns. Because the trigger is SECURITY DEFINER it also
-- records writes made by the storefront RPC and the service-role admin client,
-- which app-level logging would miss. The table is append-only to users: reads
-- are owner-only, and there are NO insert/update/delete grants or policies, so
-- nobody can tamper with the trail — only the SECURITY DEFINER trigger writes.

create table public.audit_log (
  id            bigint generated always as identity primary key,
  occurred_at   timestamptz not null default now(),
  actor_id      uuid,          -- auth.uid(); null = system/storefront/service-role
  actor_label   text,          -- snapshot of the actor's profile name at write time
  action        text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name    text not null,
  row_id        text,          -- primary key of the affected row, as text
  old_data      jsonb,
  new_data      jsonb,
  changed_fields text[]
);
create index audit_log_occurred_idx on public.audit_log (occurred_at desc);
create index audit_log_table_idx    on public.audit_log (table_name);
create index audit_log_actor_idx    on public.audit_log (actor_id);

-- Generic audit trigger. Attached to each business table below.
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_label text;
  v_old jsonb;
  v_new jsonb;
  v_rowid text;
  v_changed text[];
begin
  if v_actor is not null then
    select name into v_label from public.profiles where id = v_actor;
  end if;

  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_rowid := v_old->>'id';
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_rowid := v_new->>'id';
  else -- UPDATE
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_rowid := v_new->>'id';
    select array_agg(key order by key) into v_changed
      from jsonb_object_keys(v_new) as key
      where (v_new->key) is distinct from (v_old->key)
        and key <> 'updated_at';
    -- A no-op update (only updated_at moved) is not worth a row.
    if v_changed is null then
      return new;
    end if;
  end if;

  insert into public.audit_log(
    actor_id, actor_label, action, table_name, row_id, old_data, new_data, changed_fields
  ) values (
    v_actor, v_label, tg_op, tg_table_name, v_rowid, v_old, v_new, v_changed
  );

  return coalesce(new, old);
end $$;

-- Attach to every business table. (audit_log itself is never audited.)
create trigger audit_orders            after insert or update or delete on public.orders            for each row execute function public.audit_trigger();
create trigger audit_customers         after insert or update or delete on public.customers         for each row execute function public.audit_trigger();
create trigger audit_palay_batches     after insert or update or delete on public.palay_batches     for each row execute function public.audit_trigger();
create trigger audit_milling_runs      after insert or update or delete on public.milling_runs      for each row execute function public.audit_trigger();
create trigger audit_transactions      after insert or update or delete on public.transactions      for each row execute function public.audit_trigger();
create trigger audit_accounts          after insert or update or delete on public.accounts          for each row execute function public.audit_trigger();
create trigger audit_ppe_items         after insert or update or delete on public.ppe_items         for each row execute function public.audit_trigger();
create trigger audit_monthly_inventory after insert or update or delete on public.monthly_inventory for each row execute function public.audit_trigger();
create trigger audit_settings          after insert or update or delete on public.settings          for each row execute function public.audit_trigger();
create trigger audit_products          after insert or update or delete on public.products          for each row execute function public.audit_trigger();
create trigger audit_profiles          after insert or update or delete on public.profiles          for each row execute function public.audit_trigger();

-- RLS: owner-only read; no write access for any user (trigger-only, immutable).
alter table public.audit_log enable row level security;
create policy audit_log_owner_read on public.audit_log for select using (public.is_owner());
grant select on public.audit_log to authenticated;
