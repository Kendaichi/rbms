-- RBMS — Milestone 2 schema (tables, sequence, triggers)
-- Money as numeric (exact, never float). Quantities (kg) as numeric(12,3).
-- Palay ≠ rice: convert via milling_recovery. Locale amounts are Philippine peso.

-- ---------------------------------------------------------------------------
-- profiles: admin/staff identity (mirrors auth.users). Gates all admin RLS.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  role       text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: singleton of business-wide defaults (Orders → Dashboard SETTINGS).
-- ---------------------------------------------------------------------------
create table public.settings (
  id                        boolean primary key default true check (id = true),
  business_name             text not null default 'Rice Business Management System',
  default_price_per_kg      numeric(10,2) not null default 60,
  milling_recovery          numeric(5,4) not null default 0.62 check (milling_recovery > 0),
  mill_days_before_delivery int not null default 1 check (mill_days_before_delivery >= 0),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products: one row now (NSIC Rc 160); table supports more later.
-- ---------------------------------------------------------------------------
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  unit         text not null default 'kg',
  price_per_kg numeric(10,2) not null,
  is_active    boolean not null default true,
  image_url    text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- customers: one row per customer (Orders → Customers). auth_user_id links an
-- optional storefront account. contact_no is unique (upsert key for checkout).
-- ---------------------------------------------------------------------------
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_no    text,
  address       text,
  barangay      text,
  customer_type text not null default 'Household',
  auth_user_id  uuid references auth.users (id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now()
);
create unique index customers_contact_no_key
  on public.customers (contact_no) where contact_no is not null;

-- order numbers: ORD-001, ORD-002, ...
create sequence public.order_no_seq start 1;

-- ---------------------------------------------------------------------------
-- orders: the core lifecycle table (Orders → Orders).
-- price_per_kg, milling_recovery and mill_by are RESOLVED-AND-FROZEN at write
-- time by the orders_resolve() trigger so changing settings never alters history.
-- rice_amount / total_due / balance / palay_to_mill_kg are generated columns.
-- ---------------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_no         text unique,
  customer_id      uuid references public.customers (id) on delete set null,
  order_date       date not null default ((now() at time zone 'Asia/Manila')::date),
  fulfillment_type text not null default 'delivery' check (fulfillment_type in ('delivery', 'pickup')),
  delivery_address text,
  delivery_date    date,
  time_slot        text,
  mill_by          date,                                  -- resolved from delivery_date − settings.mill_days
  kg_ordered       numeric(12,3) not null check (kg_ordered > 0),
  price_per_kg     numeric(10,2),                         -- resolved from settings.default_price_per_kg if null
  milling_recovery numeric(5,4) check (milling_recovery > 0), -- resolved from settings if null
  delivery_fee     numeric(14,2) not null default 0 check (delivery_fee >= 0),
  amount_paid      numeric(14,2) not null default 0 check (amount_paid >= 0),
  payment_status   text not null default 'Unpaid' check (payment_status in ('Unpaid', 'Partial', 'Paid')),
  status           text not null default 'Pending' check (status in ('Pending', 'Milled', 'Delivered', 'Cancelled')),
  milled_on        date,
  delivered_on     date,
  source           text not null default 'admin' check (source in ('storefront', 'admin')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  rice_amount      numeric(14,2) generated always as (round(kg_ordered * price_per_kg, 2)) stored,
  total_due        numeric(14,2) generated always as (round(kg_ordered * price_per_kg, 2) + delivery_fee) stored,
  balance          numeric(14,2) generated always as (round(kg_ordered * price_per_kg, 2) + delivery_fee - amount_paid) stored,
  palay_to_mill_kg numeric(12,3) generated always as (round(kg_ordered / milling_recovery, 3)) stored
);
create index orders_status_idx        on public.orders (status);
create index orders_delivery_date_idx on public.orders (delivery_date);
create index orders_customer_idx      on public.orders (customer_id);

-- ---------------------------------------------------------------------------
-- palay_batches: procurement + processing costs (Cost Sheet). Derived costs are
-- generated columns so cost-per-kg of rice is always consistent.
-- ---------------------------------------------------------------------------
create table public.palay_batches (
  id               uuid primary key default gen_random_uuid(),
  purchase_date    date not null default ((now() at time zone 'Asia/Manila')::date),
  supplier         text,
  kg_purchased     numeric(12,3) not null check (kg_purchased > 0),
  price_per_kg     numeric(10,2) not null,
  drying_cost      numeric(14,2) not null default 0,
  milling_cost     numeric(14,2) not null default 0,
  transport_cost   numeric(14,2) not null default 0,
  packaging_cost   numeric(14,2) not null default 0,
  other_cost       numeric(14,2) not null default 0,
  milling_method   text not null default 'mill' check (milling_method in ('mill', 'own')),
  milling_recovery numeric(5,4) not null default 0.62 check (milling_recovery > 0),
  notes            text,
  created_at       timestamptz not null default now(),
  palay_cost        numeric(14,2) generated always as (round(kg_purchased * price_per_kg, 2)) stored,
  total_other_costs numeric(14,2) generated always as (drying_cost + milling_cost + transport_cost + packaging_cost + other_cost) stored,
  total_batch_cost  numeric(14,2) generated always as (round(kg_purchased * price_per_kg, 2) + drying_cost + milling_cost + transport_cost + packaging_cost + other_cost) stored,
  expected_rice_kg  numeric(12,3) generated always as (round(kg_purchased * milling_recovery, 3)) stored,
  cost_per_kg_rice  numeric(12,4) generated always as (
    (round(kg_purchased * price_per_kg, 2) + drying_cost + milling_cost + transport_cost + packaging_cost + other_cost)
    / nullif(round(kg_purchased * milling_recovery, 3), 0)
  ) stored
);

-- ---------------------------------------------------------------------------
-- milling_runs: palay → rice conversions; drive palay/rice on-hand.
-- ---------------------------------------------------------------------------
create table public.milling_runs (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid references public.palay_batches (id) on delete set null,
  order_id         uuid references public.orders (id) on delete set null,
  run_date         date not null default ((now() at time zone 'Asia/Manila')::date),
  palay_kg_milled  numeric(12,3) not null check (palay_kg_milled >= 0),
  rice_kg_produced numeric(12,3) not null check (rice_kg_produced >= 0),
  notes            text,
  created_at       timestamptz not null default now()
);
create index milling_runs_batch_idx on public.milling_runs (batch_id);

-- ---------------------------------------------------------------------------
-- accounts: chart of accounts (Books → Guide). Seeded in seed.sql.
-- ---------------------------------------------------------------------------
create table public.accounts (
  id             uuid primary key default gen_random_uuid(),
  title          text not null unique,
  category       text not null check (category in (
                   'Owner''s Equity', 'Income Statement', 'Cost of Goods Sold',
                   'COGS - Direct Costs', 'COGS - Overhead', 'Operating Expenses', 'Balance Sheet')),
  cash_direction text not null check (cash_direction in ('IN', 'OUT')),
  description    text,
  sort_order     int not null default 0
);

-- ---------------------------------------------------------------------------
-- transactions: the journal (Books → monthly Transactions). Debit (cash in) /
-- credit (cash out) is derived from the account's cash_direction in views.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  txn_date         date not null default ((now() at time zone 'Asia/Manila')::date),
  txn_no           text,
  particulars      text,
  account_id       uuid not null references public.accounts (id),
  amount           numeric(14,2) not null check (amount >= 0),
  ref              text,
  related_order_id uuid references public.orders (id) on delete set null,
  related_batch_id uuid references public.palay_batches (id) on delete set null,
  created_at       timestamptz not null default now(),
  month            date generated always as (date_trunc('month', txn_date::timestamp)::date) stored
);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_month_idx   on public.transactions (month);

-- ---------------------------------------------------------------------------
-- ppe_items: Property, Plant & Equipment + straight-line depreciation schedule.
-- Depreciation per month/year, start and end are generated. Depreciation expense
-- flows into the books automatically (never typed as a transaction).
-- ---------------------------------------------------------------------------
create table public.ppe_items (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  purchase_date     date not null,
  cost              numeric(14,2) not null check (cost >= 0),
  useful_life_years numeric(5,2) not null check (useful_life_years > 0),
  method            text not null default 'Straight Line' check (method in ('Straight Line')),
  salvage_pct       numeric(5,2) not null default 5,   -- percent of cost
  created_at        timestamptz not null default now(),
  salvage_value          numeric(14,2) generated always as (round(cost * salvage_pct / 100.0, 2)) stored,
  depreciation_per_year  numeric(14,2) generated always as (round((cost - round(cost * salvage_pct / 100.0, 2)) / useful_life_years, 2)) stored,
  depreciation_per_month numeric(20,6) generated always as ((cost - round(cost * salvage_pct / 100.0, 2)) / useful_life_years / 12) stored,
  depreciation_starts    date generated always as (date_trunc('month', purchase_date::timestamp)::date) stored,
  depreciation_ends      date generated always as ((date_trunc('month', purchase_date::timestamp) + make_interval(months => (useful_life_years * 12)::int))::date) stored
);

-- ---------------------------------------------------------------------------
-- monthly_inventory: owner's month-end count of unsold palay/rice at cost.
-- Needed to compute COGS correctly (Books → "Less: Ending Inventory @Cost").
-- ---------------------------------------------------------------------------
create table public.monthly_inventory (
  id                       uuid primary key default gen_random_uuid(),
  month                    date not null unique,   -- first day of the month
  ending_inventory_at_cost numeric(14,2) not null default 0,
  created_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders_resolve(): freeze price/recovery/mill_by at write time, auto-number
-- new orders, and derive payment_status from amounts.
-- ---------------------------------------------------------------------------
create or replace function public.orders_resolve() returns trigger
language plpgsql as $$
declare
  s record;
  v_total numeric(14,2);
begin
  select default_price_per_kg, milling_recovery, mill_days_before_delivery
    into s from public.settings where id = true;

  if new.price_per_kg is null then
    new.price_per_kg := coalesce(s.default_price_per_kg, 60);
  end if;
  if new.milling_recovery is null then
    new.milling_recovery := coalesce(s.milling_recovery, 0.62);
  end if;
  if new.mill_by is null and new.delivery_date is not null then
    new.mill_by := new.delivery_date - coalesce(s.mill_days_before_delivery, 1);
  end if;

  if tg_op = 'INSERT' and (new.order_no is null or new.order_no = '') then
    new.order_no := 'ORD-' || lpad(nextval('public.order_no_seq')::text, 3, '0');
  end if;

  v_total := round(new.kg_ordered * new.price_per_kg, 2) + coalesce(new.delivery_fee, 0);
  if new.status <> 'Cancelled' then
    if coalesce(new.amount_paid, 0) <= 0 then
      new.payment_status := 'Unpaid';
    elsif new.amount_paid >= v_total then
      new.payment_status := 'Paid';
    else
      new.payment_status := 'Partial';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger orders_resolve_trg
  before insert or update on public.orders
  for each row execute function public.orders_resolve();

-- keep settings.updated_at fresh
create or replace function public.touch_settings() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger settings_touch_trg
  before update on public.settings
  for each row execute function public.touch_settings();
