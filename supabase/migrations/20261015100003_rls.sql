-- RBMS — Milestone 2 security: RLS, grants, the guest-checkout broker, and the
-- auth → profile trigger. No service-role key required anywhere.

-- is_staff(): SECURITY DEFINER so it can read profiles without tripping the
-- profiles RLS policies that call it (avoids recursion).
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner', 'staff')
  );
$$;

-- Enable RLS everywhere.
alter table public.profiles          enable row level security;
alter table public.settings          enable row level security;
alter table public.products          enable row level security;
alter table public.customers         enable row level security;
alter table public.orders            enable row level security;
alter table public.palay_batches     enable row level security;
alter table public.milling_runs      enable row level security;
alter table public.accounts          enable row level security;
alter table public.transactions      enable row level security;
alter table public.ppe_items         enable row level security;
alter table public.monthly_inventory enable row level security;

-- profiles: a user reads their own row; staff manage all.
create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy profiles_staff_all on public.profiles for all
  using (public.is_staff()) with check (public.is_staff());

-- settings: readable by anyone (storefront needs default price); staff write.
create policy settings_public_read on public.settings for select using (true);
create policy settings_staff_write on public.settings for all
  using (public.is_staff()) with check (public.is_staff());

-- products: active products are public; staff see/write all.
create policy products_public_read on public.products for select
  using (is_active or public.is_staff());
create policy products_staff_write on public.products for all
  using (public.is_staff()) with check (public.is_staff());

-- customers: staff manage all; a signed-in customer reads their own row.
create policy customers_staff_all on public.customers for all
  using (public.is_staff()) with check (public.is_staff());
create policy customers_self_read on public.customers for select
  using (auth_user_id = auth.uid());

-- orders: staff manage all; a signed-in customer reads their own orders.
create policy orders_staff_all on public.orders for all
  using (public.is_staff()) with check (public.is_staff());
create policy orders_self_read on public.orders for select
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));

-- Everything else: staff only.
create policy palay_batches_staff_all     on public.palay_batches     for all using (public.is_staff()) with check (public.is_staff());
create policy milling_runs_staff_all      on public.milling_runs      for all using (public.is_staff()) with check (public.is_staff());
create policy accounts_staff_all          on public.accounts          for all using (public.is_staff()) with check (public.is_staff());
create policy transactions_staff_all      on public.transactions      for all using (public.is_staff()) with check (public.is_staff());
create policy ppe_items_staff_all         on public.ppe_items         for all using (public.is_staff()) with check (public.is_staff());
create policy monthly_inventory_staff_all on public.monthly_inventory for all using (public.is_staff()) with check (public.is_staff());

-- Role grants (RLS still filters rows; these just allow the role to reach the table).
grant usage on schema public to anon, authenticated;
grant select on public.products, public.settings to anon, authenticated;
grant select, insert, update, delete on
  public.orders, public.customers, public.palay_batches, public.milling_runs,
  public.accounts, public.transactions, public.ppe_items, public.monthly_inventory,
  public.profiles
  to authenticated;
grant usage on sequence public.order_no_seq to authenticated;
grant select on
  public.customer_summary, public.inventory_summary, public.dashboard_summary,
  public.monthly_financials, public.balance_sheet, public.year_summary
  to authenticated;

-- place_order(): the ONLY write path for the public storefront. SECURITY DEFINER
-- so anon can call it; it upserts the customer by contact, inserts the order
-- (source='storefront'; the orders trigger assigns ORD-### and freezes price),
-- and returns the order number. This is why no service-role key is needed.
create or replace function public.place_order(
  p_name text, p_contact text, p_address text, p_barangay text,
  p_fulfillment text, p_delivery_date date, p_time_slot text,
  p_kg numeric, p_notes text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_order_no text;
begin
  if p_kg is null or p_kg <= 0 then
    raise exception 'Kilograms must be greater than 0';
  end if;
  if p_fulfillment is null or p_fulfillment not in ('delivery', 'pickup') then
    raise exception 'Fulfillment must be delivery or pickup';
  end if;

  if p_contact is not null and length(trim(p_contact)) > 0 then
    select id into v_customer from public.customers where contact_no = p_contact limit 1;
  end if;
  if v_customer is null then
    insert into public.customers (name, contact_no, address, barangay)
    values (coalesce(nullif(trim(p_name), ''), 'Guest'), p_contact, p_address, p_barangay)
    returning id into v_customer;
  end if;

  insert into public.orders (
    customer_id, fulfillment_type, delivery_address, delivery_date, time_slot,
    kg_ordered, source, notes
  ) values (
    v_customer, p_fulfillment, p_address, p_delivery_date, p_time_slot,
    p_kg, 'storefront', p_notes
  ) returning order_no into v_order_no;

  return v_order_no;
end $$;

grant execute on function
  public.place_order(text, text, text, text, text, date, text, numeric, text)
  to anon, authenticated;

-- On signup, create a profile (default role 'staff'; promote to 'owner' manually).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'staff')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
