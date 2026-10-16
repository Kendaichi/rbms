-- RBMS — seed data. Chart of accounts from the Books of Account Guide, plus the
-- demo data copied from the spreadsheets so results can be checked against the
-- known numbers. Intended to run once on a fresh database.

-- Business defaults (Orders → Dashboard SETTINGS).
insert into public.settings (id, business_name, default_price_per_kg, milling_recovery, mill_days_before_delivery)
values (true, 'Rice Business Management System', 60, 0.62, 1)
on conflict (id) do nothing;

-- The product.
insert into public.products (name, slug, unit, price_per_kg, is_active)
values ('Freshly Milled Rice (NSIC Rc 160)', 'nsic-rc-160', 'kg', 60, true)
on conflict (slug) do nothing;

-- Chart of accounts (26 titles) — Books → "Books of Account Guide".
insert into public.accounts (title, category, cash_direction, description, sort_order) values
('Capital',                                        'Owner''s Equity',       'IN',  'Money you put into the business (your capital, added capital).', 1),
('Owner''s Drawing',                               'Owner''s Equity',       'OUT', 'Money you take out for personal use.', 2),
('Sales',                                          'Income Statement',      'IN',  'Every rice sale. If unpaid, also add an A/R - Unpaid Sale row.', 3),
('Other Income',                                   'Income Statement',      'IN',  'Darak (bran) sales, rice hull sales, other income.', 4),
('Purchases of Palay',                             'Cost of Goods Sold',    'OUT', 'Buying palay.', 5),
('Drying Cost',                                    'COGS - Direct Costs',   'OUT', 'Drying labor (bilad) or dryer service.', 6),
('Milling/Processing Costs',                       'COGS - Direct Costs',   'OUT', 'Milling fee at the rice mill.', 7),
('Packaging Costs',                                'COGS - Direct Costs',   'OUT', 'Sacks, plastic bags, labels, sealing.', 8),
('Transpo Costs (Hauling to Mill/Warehouse)',      'COGS - Direct Costs',   'OUT', 'Hauling palay from farm to dryer, mill and storage.', 9),
('Other Processing Charges',                       'COGS - Direct Costs',   'OUT', 'Cargador at the mill, sack sewing, other processing fees.', 10),
('Electricity Expense - Production',               'COGS - Overhead',       'OUT', 'Electricity used by your own mini miller.', 11),
('Repairs & Maintenance - Production Equipment',   'COGS - Overhead',       'OUT', 'Rubber rollers, screens, belts, miller repairs.', 12),
('Delivery and Freight-out Expense',               'Operating Expenses',    'OUT', 'Paid delivery to customers (courier, Lalamove, freight).', 13),
('Salaries and Wages',                             'Operating Expenses',    'OUT', 'Helpers, store staff, delivery helper.', 14),
('Advertising and Promotion Expense',              'Operating Expenses',    'OUT', 'FB boost, flyers, tarpaulin, free samples.', 15),
('Sales Travel and Representation',                'Operating Expenses',    'OUT', 'Travel to meet buyers or canvass.', 16),
('Transportation Expense - Delivery',              'Operating Expenses',    'OUT', 'Your own gas or fare when you deliver yourself.', 17),
('Permits and Licenses Expense',                   'Operating Expenses',    'OUT', 'DTI, barangay clearance, Mayor''s permit, grain registration.', 18),
('Insurance Expense',                              'Operating Expenses',    'OUT', 'Insurance for stock or equipment.', 19),
('Miscellaneous Expense',                          'Operating Expenses',    'OUT', 'Load, small supplies, other small costs.', 20),
('Taxes',                                          'Income Statement',      'OUT', 'BIR tax payments.', 21),
('Property, Plant & Equipment',                    'Balance Sheet',         'OUT', 'Things that last over a year: miller, scale, sealer, pallets.', 22),
('Accounts Receivable - Unpaid Sale',              'Balance Sheet',         'OUT', 'Customer took rice but has not paid (utang).', 23),
('Accounts Receivable - Collected',                'Balance Sheet',         'IN',  'Customer pays their utang later. Do not record Sales again.', 24),
('Accounts Payable - Unpaid Purchase',             'Balance Sheet',         'IN',  'You got palay or supplies but will pay later.', 25),
('Accounts Payable - Paid',                        'Balance Sheet',         'OUT', 'You pay that supplier later. Do not record the purchase again.', 26)
on conflict (title) do nothing;

-- PPE / depreciation schedule (the two depreciated items; the ₱450 tarp is a PPE
-- transaction but is not depreciated, matching the workbook).
insert into public.ppe_items (name, purchase_date, cost, useful_life_years, method, salvage_pct) values
('Mini Rice Milling Machine',   '2026-10-10', 15000, 10, 'Straight Line', 5),
('Sack Sealing Sewing Machine', '2026-10-10', 2534,  10, 'Straight Line', 5);

-- October 2026 journal (Books → FY2026 Oct Transactions).
insert into public.transactions (txn_date, txn_no, particulars, account_id, amount) values
('2026-10-10', 'C01',     'Starting Capital',                      (select id from public.accounts where title = 'Capital'),                      100000),
('2026-10-10', 'PPE01',   'Purchased Mini Rice Milling Machine',   (select id from public.accounts where title = 'Property, Plant & Equipment'),   15000),
('2026-10-10', 'PPE02',   'Sack Sealing Sewing Machine',           (select id from public.accounts where title = 'Property, Plant & Equipment'),   2534),
('2026-10-10', 'DC-PC01', '50pcs of 25kg Rice Sack for 800.00',    (select id from public.accounts where title = 'Packaging Costs'),               800),
('2026-10-14', 'PPE03',   '10M of Tarp Cover @45/M',               (select id from public.accounts where title = 'Property, Plant & Equipment'),   450),
('2026-10-15', 'PP01',    'Purchase of 4118kg of palay @22.00/kg', (select id from public.accounts where title = 'Purchases of Palay'),            90596);

-- Customers (Orders → Customers).
insert into public.customers (name, contact_no, address, barangay, customer_type) values
('Marissa S. Cervantes', '9632893032',      'Brgy. Example',        'Example',       'Household'),
('Joan V. Lira',          '09158066451/71', 'Brgy. Villa Kananga',  'Villa Kananga', 'Household'),
('March Belle F. Lor',    '9175778458',     'T. Claudio St.',       'T. Claudio',    'Household'),
('Ma. Ruchi A. Plaza',    '9778855339',     'Brgy. Golden Ribbon',  'Golden Ribbon', 'Household'),
('Graciela Miranda',      '9274987953',     'Brgy. Baan KM3',       'Baan KM3',      'Household');

-- Orders (Orders → Orders). price_per_kg / milling_recovery / mill_by are filled
-- by the orders_resolve() trigger; amount_paid defaults 0 → payment_status Unpaid.
insert into public.orders (order_no, customer_id, order_date, fulfillment_type, delivery_address, delivery_date, time_slot, kg_ordered, status, source) values
('ORD-001', (select id from public.customers where contact_no = '9632893032'),      '2026-10-15', 'delivery', 'Brgy. Example',       '2026-10-25', 'Morning (8-12)', 100, 'Pending', 'admin'),
('ORD-002', (select id from public.customers where contact_no = '09158066451/71'),  '2026-10-15', 'delivery', 'Brgy. Villa Kananga', '2026-10-25', 'Morning (8-12)',  25, 'Pending', 'admin'),
('ORD-003', (select id from public.customers where contact_no = '9175778458'),      '2026-10-15', 'delivery', 'T. Claudio St.',      '2026-10-25', 'Morning (8-12)',  25, 'Pending', 'admin'),
('ORD-004', (select id from public.customers where contact_no = '9778855339'),      '2026-10-15', 'delivery', 'Brgy. Golden Ribbon', '2026-11-22', 'Morning (8-12)', 100, 'Pending', 'admin'),
('ORD-005', (select id from public.customers where contact_no = '9274987953'),      '2026-10-15', 'delivery', 'Brgy. Baan KM3',      '2026-10-29', 'Morning (8-12)',  25, 'Pending', 'admin');

-- Keep the order-number sequence ahead of the seeded ORD-005.
select setval('public.order_no_seq', 5, true);
