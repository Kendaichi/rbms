-- RBMS — Owner/Staff privilege split.
-- Until now is_staff() gated every admin table, so 'owner' and 'staff' were
-- functionally identical. This adds is_owner() and locks the financial +
-- configuration surfaces (books, settings) and user-role management (profiles)
-- to owners only. Operations tables (orders, customers, palay_batches,
-- milling_runs, products) stay staff-accessible via the existing is_staff()
-- policies, which are left untouched.

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'owner'
  );
$$;

-- Books of account → owner only (read + write). Staff have no books access.
drop policy if exists transactions_staff_all on public.transactions;
create policy transactions_owner_all on public.transactions for all
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists accounts_staff_all on public.accounts;
create policy accounts_owner_all on public.accounts for all
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists ppe_items_staff_all on public.ppe_items;
create policy ppe_items_owner_all on public.ppe_items for all
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists monthly_inventory_staff_all on public.monthly_inventory;
create policy monthly_inventory_owner_all on public.monthly_inventory for all
  using (public.is_owner()) with check (public.is_owner());

-- Settings → owner writes only. The storefront still needs to read the default
-- price, so settings_public_read (SELECT using true, from the RLS migration) is
-- deliberately left in place; only the write policy is tightened.
drop policy if exists settings_staff_write on public.settings;
create policy settings_owner_write on public.settings for all
  using (public.is_owner()) with check (public.is_owner());

-- Profiles → owners manage everyone; a user still reads only their own row.
-- This CLOSES a privilege-escalation hole: the old profiles_staff_all policy let
-- any staff member set their own role to 'owner'. profiles_self_read (from the
-- RLS migration) remains, so the admin shell's current-user lookup still works.
drop policy if exists profiles_staff_all on public.profiles;
create policy profiles_owner_all on public.profiles for all
  using (public.is_owner()) with check (public.is_owner());
