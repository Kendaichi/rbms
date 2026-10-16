-- Auto-number journal entries. Each account carries a ref_prefix; a BEFORE INSERT
-- trigger fills transactions.txn_no with <prefix><running number> when it is left
-- blank, so manual entries and batch posts both get refs like PPE04, PP02. A
-- supplied txn_no (e.g. a posted sale that reuses the order_no) is kept as-is.

alter table public.accounts add column if not exists ref_prefix text;

-- Prefix per account (matches the working-paper convention: C, PPE, PP, …).
update public.accounts a set ref_prefix = v.p from (values
  ('Capital', 'C'),
  ('Owner''s Drawing', 'OD'),
  ('Sales', 'S'),
  ('Other Income', 'OI'),
  ('Purchases of Palay', 'PP'),
  ('Drying Cost', 'DC'),
  ('Milling/Processing Costs', 'MC'),
  ('Packaging Costs', 'PC'),
  ('Transpo Costs (Hauling to Mill/Warehouse)', 'TC'),
  ('Other Processing Charges', 'OPC'),
  ('Electricity Expense - Production', 'EE'),
  ('Repairs & Maintenance - Production Equipment', 'RM'),
  ('Delivery and Freight-out Expense', 'DF'),
  ('Salaries and Wages', 'SW'),
  ('Advertising and Promotion Expense', 'AP'),
  ('Sales Travel and Representation', 'STR'),
  ('Transportation Expense - Delivery', 'TED'),
  ('Permits and Licenses Expense', 'PL'),
  ('Insurance Expense', 'IE'),
  ('Miscellaneous Expense', 'ME'),
  ('Taxes', 'TAX'),
  ('Property, Plant & Equipment', 'PPE'),
  ('Accounts Receivable - Unpaid Sale', 'ARU'),
  ('Accounts Receivable - Collected', 'ARC'),
  ('Accounts Payable - Unpaid Purchase', 'APU'),
  ('Accounts Payable - Paid', 'APP')
) as v(title, p)
where a.title = v.title;

-- Next ref for a prefix = prefix + zero-padded (max existing numeric suffix + 1).
-- The numeric-suffix filter keeps overlapping prefixes apart (e.g. 'PP' ignores
-- 'PPE01' because 'E01' is not all digits).
create or replace function public.next_txn_no(p_prefix text) returns text
language sql set search_path = public as $$
  select p_prefix
    || lpad((coalesce(max(substring(txn_no from length(p_prefix) + 1)::int), 0) + 1)::text, 2, '0')
  from public.transactions
  where txn_no like p_prefix || '%'
    and substring(txn_no from length(p_prefix) + 1) ~ '^[0-9]+$';
$$;

create or replace function public.transactions_autoref() returns trigger
language plpgsql set search_path = public as $$
declare
  v_prefix text;
begin
  if new.txn_no is null or new.txn_no = '' then
    select ref_prefix into v_prefix from public.accounts where id = new.account_id;
    if v_prefix is not null and v_prefix <> '' then
      new.txn_no := public.next_txn_no(v_prefix);
    end if;
  end if;
  return new;
end $$;

create trigger transactions_autoref_trg
  before insert on public.transactions
  for each row execute function public.transactions_autoref();
