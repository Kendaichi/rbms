-- RBMS — Per-user page access + drop the customer role.
-- Builds on 20261016140000_owner_staff_split.sql (already applied). Roles become
-- owner/staff only. Each profile carries a page_access text[] of grantable pages;
-- owners implicitly have every page. RLS on every admin table now checks the
-- relevant page grant via has_any_page(), so access is enforced per user, not
-- just per role. Users management (profiles writes) stays owner-only and is NOT
-- grantable — granting it would let a staff member escalate themselves.

-- 1) Per-user page grants. Defaults to no pages; the trigger and admin add-user
--    flow set it explicitly for new users.
alter table public.profiles
  add column if not exists page_access text[] not null default '{}';

-- 2) Backward-compat: existing staff keep full access (all grantable pages) so
--    nobody is locked out by this migration. Owners don't need grants (they pass
--    has_any_page on role alone). Run BEFORE the customer→staff conversion below
--    so converted customers do NOT inherit full access.
update public.profiles
  set page_access = array[
    'dashboard','orders','customers','deliveries','inventory','costing','books','settings'
  ]
  where role = 'staff' and (page_access is null or page_access = '{}');

-- 3) Drop the customer role: convert any customer (or other) profile to a staff
--    account with NO pages — effectively locked out until an owner grants access.
--    (The storefront is guest-based, so customer login accounts were unused.)
update public.profiles
  set role = 'staff', page_access = '{}'
  where role not in ('owner', 'staff');

-- 4) Role constraint → owner/staff only; default new rows to staff.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'staff'));
alter table public.profiles alter column role set default 'staff';

-- 5) New auth users default to staff with NO pages. Public sign-ups should be
--    DISABLED in Supabase Auth — the owner creates back-office users via the
--    service-role add-user flow, which sets role + pages explicitly afterward.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, page_access)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'staff', '{}')
  on conflict (id) do nothing;
  return new;
end $$;

-- 6) has_any_page(pages): true if the caller is an owner, or their page_access
--    overlaps the given pages (&& is the array-overlap operator). SECURITY
--    DEFINER so it reads profiles without tripping profiles RLS.
create or replace function public.has_any_page(pages text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
      and (pr.role = 'owner' or pr.page_access && pages)
  );
$$;

-- 7) Re-point every admin table's policy at the pages that legitimately use it.
--    Drop whatever policy currently exists (is_staff from the RLS migration or
--    is_owner from the owner/staff split) and recreate it grant-aware.

-- orders: used by dashboard, orders, customers, deliveries, inventory, books.
drop policy if exists orders_staff_all on public.orders;
drop policy if exists orders_access on public.orders;
create policy orders_access on public.orders for all
  using (public.has_any_page(array['orders','dashboard','deliveries','customers','inventory','books']))
  with check (public.has_any_page(array['orders','dashboard','deliveries','customers','inventory','books']));

-- customers: used by customers, orders, dashboard, books.
drop policy if exists customers_staff_all on public.customers;
drop policy if exists customers_access on public.customers;
create policy customers_access on public.customers for all
  using (public.has_any_page(array['customers','orders','dashboard','books']))
  with check (public.has_any_page(array['customers','orders','dashboard','books']));

-- palay_batches: used by inventory, costing, books.
drop policy if exists palay_batches_staff_all on public.palay_batches;
drop policy if exists palay_batches_access on public.palay_batches;
create policy palay_batches_access on public.palay_batches for all
  using (public.has_any_page(array['inventory','costing','books']))
  with check (public.has_any_page(array['inventory','costing','books']));

-- milling_runs: used by inventory, books.
drop policy if exists milling_runs_staff_all on public.milling_runs;
drop policy if exists milling_runs_access on public.milling_runs;
create policy milling_runs_access on public.milling_runs for all
  using (public.has_any_page(array['inventory','books']))
  with check (public.has_any_page(array['inventory','books']));

-- Books tables: books page only.
drop policy if exists transactions_owner_all on public.transactions;
drop policy if exists transactions_staff_all on public.transactions;
drop policy if exists transactions_books_all on public.transactions;
create policy transactions_books_all on public.transactions for all
  using (public.has_any_page(array['books'])) with check (public.has_any_page(array['books']));

drop policy if exists accounts_owner_all on public.accounts;
drop policy if exists accounts_staff_all on public.accounts;
drop policy if exists accounts_books_all on public.accounts;
create policy accounts_books_all on public.accounts for all
  using (public.has_any_page(array['books'])) with check (public.has_any_page(array['books']));

drop policy if exists ppe_items_owner_all on public.ppe_items;
drop policy if exists ppe_items_staff_all on public.ppe_items;
drop policy if exists ppe_items_books_all on public.ppe_items;
create policy ppe_items_books_all on public.ppe_items for all
  using (public.has_any_page(array['books'])) with check (public.has_any_page(array['books']));

drop policy if exists monthly_inventory_owner_all on public.monthly_inventory;
drop policy if exists monthly_inventory_staff_all on public.monthly_inventory;
drop policy if exists monthly_inventory_books_all on public.monthly_inventory;
create policy monthly_inventory_books_all on public.monthly_inventory for all
  using (public.has_any_page(array['books'])) with check (public.has_any_page(array['books']));

-- settings: writes gated on the settings page; public read stays (storefront
-- needs the default price), so settings_public_read is left untouched.
drop policy if exists settings_owner_write on public.settings;
drop policy if exists settings_staff_write on public.settings;
drop policy if exists settings_page_write on public.settings;
create policy settings_page_write on public.settings for all
  using (public.has_any_page(array['settings'])) with check (public.has_any_page(array['settings']));

-- profiles stays owner-only (profiles_owner_all + profiles_self_read from the
-- earlier migrations) — user management is intentionally not grantable.
