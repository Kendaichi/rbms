-- RBMS — Milestone 2 computed layer (functions + views).
-- All views use security_invoker so row-level security of the underlying tables
-- applies to the querying user (no privilege leak through a view).

-- Straight-line depreciation expense for a single month (sum across PPE items).
create or replace function public.depreciation_for_month(p_month date)
returns numeric language sql stable as $$
  select coalesce(sum(depreciation_per_month), 0)
  from public.ppe_items
  where date_trunc('month', p_month) >= depreciation_starts
    and date_trunc('month', p_month) <  depreciation_ends;
$$;

-- Accumulated depreciation to the end of p_as_of's month (capped at useful life).
create or replace function public.accumulated_depreciation(p_as_of date)
returns numeric language sql stable as $$
  select coalesce(sum(
    least(
      greatest(
        ((extract(year  from p_as_of) - extract(year  from depreciation_starts)) * 12
       + (extract(month from p_as_of) - extract(month from depreciation_starts)))::int + 1,
        0),
      (useful_life_years * 12)::int
    ) * depreciation_per_month
  ), 0)
  from public.ppe_items
  where date_trunc('month', p_as_of) >= depreciation_starts;
$$;

-- Per-customer rollups (Orders → Customers derived columns).
create view public.customer_summary with (security_invoker = true) as
select
  c.id, c.name, c.contact_no, c.address, c.barangay, c.customer_type,
  c.auth_user_id, c.notes, c.created_at,
  count(o.id)                filter (where o.status <> 'Cancelled')        as no_of_orders,
  coalesce(sum(o.kg_ordered) filter (where o.status <> 'Cancelled'), 0)    as total_kg,
  coalesce(sum(o.total_due)  filter (where o.status <> 'Cancelled'), 0)    as total_spent,
  coalesce(sum(o.balance)    filter (where o.status <> 'Cancelled'), 0)    as unpaid_balance,
  max(o.order_date)                                                         as last_order
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

-- Palay / rice on hand (Dashboard → PALAY STOCK).
create view public.inventory_summary with (security_invoker = true) as
select
  coalesce((select sum(kg_purchased)     from public.palay_batches), 0) as palay_bought,
  coalesce((select sum(palay_kg_milled)  from public.milling_runs),  0) as palay_milled,
  coalesce((select sum(kg_purchased)     from public.palay_batches), 0)
    - coalesce((select sum(palay_kg_milled) from public.milling_runs), 0) as palay_on_hand,
  coalesce((select sum(rice_kg_produced) from public.milling_runs),  0) as rice_milled,
  coalesce((select sum(rice_kg_produced) from public.milling_runs),  0)
    - coalesce((select sum(kg_ordered) from public.orders where status = 'Delivered'), 0) as rice_on_hand;

-- KPI strip (Orders → Dashboard).
create view public.dashboard_summary with (security_invoker = true) as
with today as (select (now() at time zone 'Asia/Manila')::date as d)
select
  (select count(*)                          from public.orders where status = 'Pending')              as pending_orders,
  (select coalesce(sum(kg_ordered), 0)       from public.orders where status = 'Pending')              as rice_to_mill_pending,
  (select coalesce(sum(palay_to_mill_kg), 0) from public.orders where status = 'Pending')              as palay_to_mill_pending,
  (select count(*)                          from public.orders where status <> 'Cancelled')           as active_orders,
  (select coalesce(sum(kg_ordered), 0)       from public.orders where status <> 'Cancelled')           as total_kg,
  (select coalesce(sum(total_due), 0)        from public.orders where status <> 'Cancelled')           as total_sales,
  (select coalesce(sum(amount_paid), 0)      from public.orders where status <> 'Cancelled')           as collected,
  (select coalesce(sum(balance), 0)          from public.orders where status <> 'Cancelled')           as unpaid_balance,
  (select count(*) from public.orders, today where status not in ('Delivered','Cancelled') and delivery_date < today.d)       as overdue_deliveries,
  (select count(*) from public.orders, today where status <> 'Cancelled' and delivery_date = today.d)                        as deliveries_today,
  (select count(*) from public.orders, today where status <> 'Cancelled' and delivery_date = today.d + 1)                    as deliveries_tomorrow,
  (select count(*) from public.orders, today where status <> 'Cancelled' and delivery_date between today.d and today.d + 7)  as deliveries_next_7;

-- Monthly income statement (Books → monthly sheets). COGS = beginning inventory
-- + purchases + processing − ending inventory. Operating expenses include
-- auto straight-line depreciation.
create view public.monthly_financials with (security_invoker = true) as
with mm as (
  select month as m from public.transactions
  union
  select month      from public.monthly_inventory
),
months as (select distinct m from mm),
agg as (
  select t.month as m,
    coalesce(sum(t.amount) filter (where a.title = 'Sales'), 0)               as sales,
    coalesce(sum(t.amount) filter (where a.title = 'Other Income'), 0)        as other_income,
    coalesce(sum(t.amount) filter (where a.title = 'Purchases of Palay'), 0)  as purchases,
    coalesce(sum(t.amount) filter (where a.title in
      ('Drying Cost','Milling/Processing Costs','Packaging Costs',
       'Transpo Costs (Hauling to Mill/Warehouse)','Other Processing Charges')), 0) as direct_costs,
    coalesce(sum(t.amount) filter (where a.title in
      ('Electricity Expense - Production','Repairs & Maintenance - Production Equipment')), 0) as overhead_costs,
    coalesce(sum(t.amount) filter (where a.category = 'Operating Expenses'), 0) as opex_cash,
    coalesce(sum(t.amount) filter (where a.title = 'Taxes'), 0)                 as taxes
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  group by t.month
),
base as (
  select
    months.m                                    as month,
    coalesce(agg.sales, 0)                      as sales,
    coalesce(agg.other_income, 0)               as other_income,
    coalesce(agg.purchases, 0)                  as purchases,
    coalesce(agg.direct_costs, 0)               as direct_costs,
    coalesce(agg.overhead_costs, 0)             as overhead_costs,
    coalesce(agg.opex_cash, 0)                  as opex_cash,
    coalesce(agg.taxes, 0)                      as taxes,
    coalesce(mi.ending_inventory_at_cost, 0)    as ending_inventory,
    coalesce(bi.ending_inventory_at_cost, 0)    as beginning_inventory,
    public.depreciation_for_month(months.m)     as depreciation
  from months
  left join agg on agg.m = months.m
  left join public.monthly_inventory mi on mi.month = months.m
  left join public.monthly_inventory bi on bi.month = (months.m - interval '1 month')::date
)
select
  month, sales, other_income, purchases, direct_costs, overhead_costs,
  (direct_costs + overhead_costs)                                                        as processing_cost,
  beginning_inventory, ending_inventory,
  (beginning_inventory + purchases + direct_costs + overhead_costs - ending_inventory)   as cogs,
  (sales + other_income
     - (beginning_inventory + purchases + direct_costs + overhead_costs - ending_inventory)) as gross_profit,
  (opex_cash + depreciation)                                                             as operating_expenses,
  depreciation,
  (sales + other_income
     - (beginning_inventory + purchases + direct_costs + overhead_costs - ending_inventory)
     - (opex_cash + depreciation))                                                       as earnings_before_taxes,
  taxes,
  (sales + other_income
     - (beginning_inventory + purchases + direct_costs + overhead_costs - ending_inventory)
     - (opex_cash + depreciation) - taxes)                                               as net_profit
from base
order by month;

-- Balance sheet as of today (Asia/Manila). This FIXES the source workbook's
-- "NOT balanced" bug: the sheet omitted capital from cash (showed −109,380);
-- here cash = Σ(IN) − Σ(OUT) = −9,380, so Assets = Liabilities + Equity.
create view public.balance_sheet with (security_invoker = true) as
select *,
  (round(total_assets, 2) = round(total_liabilities_and_equity, 2)) as is_balanced
from (
  with p as (select (now() at time zone 'Asia/Manila')::date as as_of),
  tx as (
    select t.amount, a.title, a.cash_direction
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    cross join p
    where t.txn_date <= p.as_of
  ),
  parts as (
    select
      coalesce(sum(case when cash_direction = 'IN' then amount else -amount end), 0) as cash,
      coalesce(sum(case when title = 'Accounts Receivable - Unpaid Sale' then amount
                        when title = 'Accounts Receivable - Collected'   then -amount else 0 end), 0) as accounts_receivable,
      coalesce(sum(amount) filter (where title = 'Property, Plant & Equipment'), 0) as ppe_cost,
      coalesce(sum(case when title = 'Accounts Payable - Unpaid Purchase' then amount
                        when title = 'Accounts Payable - Paid'            then -amount else 0 end), 0) as accounts_payable,
      coalesce(sum(case when title = 'Capital'          then amount
                        when title = 'Owner''s Drawing' then -amount else 0 end), 0) as capital
    from tx
  )
  select
    p.as_of,
    parts.cash,
    parts.accounts_receivable,
    coalesce((select mi.ending_inventory_at_cost from public.monthly_inventory mi
              where mi.month <= p.as_of order by mi.month desc limit 1), 0) as inventory,
    parts.ppe_cost,
    public.accumulated_depreciation(p.as_of)                        as accumulated_depreciation,
    (parts.ppe_cost - public.accumulated_depreciation(p.as_of))     as ppe_net,
    parts.accounts_payable,
    parts.capital,
    coalesce((select sum(net_profit) from public.monthly_financials mf
              where mf.month <= date_trunc('month', p.as_of)::date), 0) as retained_earnings,
    (parts.cash + parts.accounts_receivable
       + coalesce((select mi.ending_inventory_at_cost from public.monthly_inventory mi
                   where mi.month <= p.as_of order by mi.month desc limit 1), 0)
       + (parts.ppe_cost - public.accumulated_depreciation(p.as_of))) as total_assets,
    (parts.accounts_payable + parts.capital
       + coalesce((select sum(net_profit) from public.monthly_financials mf
                   where mf.month <= date_trunc('month', p.as_of)::date), 0)) as total_liabilities_and_equity
  from parts cross join p
) q;

-- Year roll-up (Books → Year Summary).
create view public.year_summary with (security_invoker = true) as
select
  extract(year from month)::int as year,
  sum(sales)                 as sales,
  sum(other_income)          as other_income,
  sum(purchases)             as purchases,
  sum(processing_cost)       as processing_cost,
  sum(cogs)                  as cogs,
  sum(operating_expenses)    as operating_expenses,
  sum(earnings_before_taxes) as earnings_before_taxes,
  sum(taxes)                 as taxes,
  sum(net_profit)            as net_profit
from public.monthly_financials
group by 1
order by 1;
