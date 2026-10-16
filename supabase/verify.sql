-- RBMS — Milestone 2 verification. Run in the Supabase SQL Editor (as postgres,
-- which bypasses RLS) after applying the migrations + seed. Every 'actual'
-- should match 'expected' (the spreadsheet oracle). The balance sheet must balance.
with d   as (select * from public.dashboard_summary),
     inv as (select * from public.inventory_summary),
     oct as (select * from public.monthly_financials where month = date '2026-10-01'),
     bs  as (select * from public.balance_sheet)
select * from (values
  ('pending_orders',         '5',          (select pending_orders::text                 from d)),
  ('total_kg',               '275',        (select round(total_kg)::text                from d)),
  ('total_sales',            '16500.00',   (select round(total_sales,2)::text           from d)),
  ('unpaid_balance',         '16500.00',   (select round(unpaid_balance,2)::text        from d)),
  ('palay_on_hand',          '4118',       (select round(palay_on_hand)::text           from inv)),
  ('palay_to_mill_pending',  '443.548',    (select round(palay_to_mill_pending,3)::text from d)),
  ('oct_cogs',               '91396.00',   (select round(cogs,2)::text                  from oct)),
  ('oct_depreciation',       '138.8108',   (select round(depreciation,4)::text          from oct)),
  ('oct_net_profit',         '-91534.81',  (select round(net_profit,2)::text            from oct)),
  ('bs_cash',                '-9380.00',   (select round(cash,2)::text                  from bs)),
  ('bs_total_assets',        '8465.19',    (select round(total_assets,2)::text          from bs)),
  ('bs_total_liab_equity',   '8465.19',    (select round(total_liabilities_and_equity,2)::text from bs)),
  ('bs_is_balanced',         'true',       (select is_balanced::text                    from bs))
) as t(check_name, expected, actual);
