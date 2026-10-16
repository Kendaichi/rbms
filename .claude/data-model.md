# Data model

> Summary, not a schema dump. Derived from the reference spreadsheets (**inferred** — verify against
> `Rice_Orders.xlsx` / `FDD_Books_of_Account.xlsx` / `Rice_Simple_Cost_Sheet (1).xlsx` before relying on
> specifics). Update this file whenever entities/relationships change.

## Tables (11)

| Table | Key columns | Notes / source |
|---|---|---|
| `profiles` | `id` (= auth.uid), `role` ('owner'\|'staff'), `name` | Admin/staff identity; gates RLS. One owner at launch. |
| `settings` | singleton: `default_price_per_kg` (60), `milling_recovery` (0.62), `mill_days_before_delivery` (1), business info | Orders → Dashboard SETTINGS |
| `products` | `name`, `slug`, `unit` ('kg'), `price_per_kg`, `is_active`, `image_url` | One row now (NSIC Rc 160); table allows more (darak/hull later) |
| `customers` | `name`, `contact_no`, `address`, `barangay`, `customer_type`, `auth_user_id?`, `notes` | Orders → Customers. `auth_user_id` links an optional account |
| `orders` | `order_no` (ORD-###), `customer_id`, `order_date`, `fulfillment_type`, `delivery_address`, `delivery_date`, `time_slot`, `mill_by`*, `kg_ordered`, `price_per_kg`*, `delivery_fee`, `amount_paid`, `payment_status`, `status`, `milled_on`, `delivered_on`, `palay_to_mill_kg`*, `source`, `notes` | Orders → Orders. `*` = resolved-and-frozen at write time |
| `palay_batches` | `purchase_date`, `supplier`, `sacks?`, `kg_purchased`, `price_per_kg`, `drying_cost`, `milling_cost`, `transport_cost`, `packaging_cost`, `other_cost` | Cost Sheet. No stored recovery/method — recovery & cost-per-kg-rice are DERIVED from `milling_runs` (actual). `sacks` is informational; `kg_purchased` is the cost basis |
| `milling_runs` | `batch_id?`, `order_id?`, `run_date`, `palay_kg_milled`, `rice_kg_produced` | Drives palay/rice on-hand AND the derived recovery (rice÷palay) |
| `accounts` | `title` (unique), `category`, `cash_direction` ('IN'\|'OUT'), `description`, `ref_prefix` | Books → Guide (~26 titles seeded). `ref_prefix` drives auto-numbered `txn_no` |
| `transactions` | `txn_date`, `txn_no`*, `particulars`, `account_id`, `amount`, `ref`, `related_order_id?`, `related_batch_id?` | Books → monthly Transactions. `*txn_no` auto-numbers from the account's `ref_prefix` when left blank |
| `audit_log` | `occurred_at`, `actor_id?`, `actor_label`, `action`, `table_name`, `row_id`, `old_data`, `new_data`, `changed_fields` | Append-only trail; trigger on every table; owner-only read, immutable |
| `ppe_items` | `name`, `purchase_date`, `cost`, `useful_life_years`, `method` ('Straight Line'), `salvage_pct` | Books → Depreciation Schedule. Monthly dep. computed, not typed |
| `monthly_inventory` | `month`, `ending_inventory_at_cost` | Books → "Less: Ending Inventory @Cost" (manual month-end count) |

## Enums / domains
- `order.status`: `Pending` → `Milled` → `Delivered`, or `Cancelled`.
- `order.payment_status`: `Unpaid` \| `Partial` \| `Paid`.
- `order.fulfillment_type`: `delivery` \| `pickup`. `time_slot`: e.g. `Morning (8-12)`, `Afternoon (1-5)`.
- `account.category`: `Owner's Equity` \| `Income Statement` \| `COGS-Direct` \| `COGS-Overhead` \| `Operating Expenses` \| `Balance Sheet`.

## Computed (SQL views / `lib/calc`, not stored)
- **Order**: `rice_amount = kg_ordered × price_per_kg`; `total_due = rice_amount + delivery_fee`;
  `balance = total_due − amount_paid`.
- **Customer rollups**: order count, total kg, total spent, unpaid balance, last order.
- **Dashboard**: pending/to-mill; deliveries today/tomorrow/next-7/overdue; palay-on-hand
  (`Σ batches.kg_purchased − Σ milling_runs.palay_kg_milled`); rice-on-hand; sales/collected/unpaid.
- **Books**: Income Statement; COGS (`beg_inv + purchases + processing − end_inv`); Operating Expenses
  (incl. auto straight-line depreciation); Balance Sheet; Year Summary roll-up.

## Relationships
- `orders.customer_id → customers.id`; `customers.auth_user_id → auth.users.id` (optional).
- `milling_runs.batch_id → palay_batches.id`; `milling_runs.order_id → orders.id`.
- `transactions.account_id → accounts.id`; `transactions.related_order_id → orders.id`;
  `transactions.related_batch_id → palay_batches.id`.
- `profiles.id → auth.users.id`.

## Known-good figures (oracle, from the seeded sheet data)
- Orders: 5 pending, 275 kg, ₱16,500 sales, ₱16,500 unpaid; palay on hand 4118 kg; palay-to-mill ≈443.5 kg.
- Costing (4118 kg @ ₱22, recovery 0.62): pay-a-mill cost/kg ≈₱45.42, rice ≈2553 kg; own-miller ≈₱40.58.
- Books (Oct 2026): COGS 91,396; net profit ≈−₱91,534.81; monthly depreciation ≈₱138.81.

## Realtime (Milestone 9)
- All admin tables (`orders, customers, palay_batches, milling_runs, transactions, accounts, ppe_items,
  monthly_inventory, settings, products`) are in the `supabase_realtime` publication with
  `replica identity full` (migration `20261016130000_realtime.sql`). The admin UI subscribes via the browser
  client and caches rows in a Zustand store (`lib/store/`); Realtime enforces the same RLS as table reads, so
  anon/customer sessions receive nothing. Dashboard/customer/inventory rollups are recomputed client-side in
  `lib/store/selectors.ts` (kept in lock-step with the SQL views).
