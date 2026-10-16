# Decisions

> ADR-style: the decision + the why / trade-off. Mark entries "inferred" if reconstructed from the
> spreadsheets rather than decided live. Append new entries; don't rewrite history.

## Scope & delivery
- **Build the full system in one delivery** (storefront + orders + inventory + costing + complete books),
  staged into testable milestones — rather than back-office-first or store-first.
  *Why:* the owner wants the whole thing; staging keeps each step verifiable without delaying any one domain.
- **Claude project setup is Milestone 0, done before any app code.** *Why:* the rulebook + knowledge
  base steer the whole build and encode the rice-domain landmines up front. Per `claude_setup.md`.

## Product & commerce
- **One product (NSIC Rc 160), ordered by the kilo.** *Why:* matches current orders (25/100 kg).
  Rejected fixed pack-size SKUs and multi-product for now. `products` is multi-row so darak (bran),
  rice hull, and other varieties can be added later without schema change.
- **Guest checkout + optional customer account.** *Why:* lowest friction and matches the data captured
  today (name + contact + address). Optional Supabase email account adds order history. Rejected
  mandatory email accounts (signup friction) and phone OTP (needs a paid SMS provider).
- **Manual payment recording + utang (unpaid balances).** *Why:* mirrors the current Orders sheet and
  books (pay on delivery/pickup via cash/GCash; track `payment_status` and balance). No payment gateway
  at launch. Rejected online payment now; PayMongo (GCash/card) is a clean later add.

## Technical
- **Next.js (App Router) + Supabase (Postgres/Auth/RLS/Storage).** *Why:* user-chosen; one app serves
  both storefront and admin via route groups.
- **Anonymous order writes are brokered by a Server Action** using the server Supabase client; anon
  roles get no table-level write policies. *Why:* keeps the public surface from writing tables directly
  while still allowing guest checkout.
- **RLS as the security boundary.** Admin tables are staff-only (`profiles.role`); a customer reads only
  their own orders. *Why:* defense in depth beyond app-layer guards.
- **Money as integer centavos / `numeric`, never float; all math in `lib/calc` pure functions.**
  *Why:* the spreadsheets show float rounding drift; pure functions are unit-testable against the sheet.
- **Resolve-and-freeze `price_per_kg` and `milling_recovery` onto each order.** *Why:* changing
  `settings` later must not retroactively alter past orders' totals or mill math.
- **Financial statements are computed (SQL views / `lib/calc`), not stored tables.** *Why:* single
  source of truth is the journal + PPE + month-end inventory; statements always reconcile.
- **Depreciation is generated from `ppe_items` (straight-line), not entered as transactions.** *Why:*
  matches the workbook's note and prevents double-entry mistakes.
- **Disabled Next 16 `cacheComponents` (dynamicIO) + `partialPrefetching`** (reversed the create-next-app
  default). *Why:* RBMS is dominated by request-time dynamic data (live products/orders, forms, auth,
  dashboards); dynamicIO's Suspense/`"use cache"` requirements add friction with no caching benefit for
  this workload. Revisit per-page opt-in caching later if a genuinely static page appears.
- **Generated-column expressions must be IMMUTABLE** — `date_trunc('month', <date>)` resolves to the
  timezone-dependent (stable) overload, so in stored generated columns cast to `::timestamp` first
  (`date_trunc('month', d::timestamp)`). Learned from error `42P17` applying migration 1.
- **Guest tracking via `track_order()` SECURITY DEFINER RPC** (not a broad anon RLS read). *Why:* RLS
  policies can't take request parameters; the RPC returns an order only when the caller supplies both
  the order number and the matching contact.
- **Books auto-posting is owner-confirmed, never automatic** (2026-10-16, M7). Delivered orders and
  palay batches appear in "post" panels on the Journal; the owner clicks to write the transactions.
  *Why:* the owner wants control over what hits the books; a silent trigger risks posting mistakes that
  are hard to unwind. Idempotency is enforced by `transactions.related_order_id` / `related_batch_id` —
  a Sales row already linked to an order (or a Purchases row to a batch) blocks a second post.
- **Revenue recognised on Delivered, not at order time** (2026-10-16, M7; owner choice). Posting a
  delivered order writes a **Sales** row for the rice amount; if a delivery fee was charged it also
  writes that to **Other Income**; then Accounts Receivable is reconciled to the order's balance. *Why:*
  the rice has actually left; the A/R offsets the income cash-in so cash reflects only what was collected
  and the balance sheet stays balanced.
- **A/R is reconciled to the order balance, centrally** (2026-10-16, M8). `reconcileOrderReceivable()`
  in `lib/books/posting.ts` compares A/R already on the books for an order against its current balance
  (`total_due − amount_paid`) and posts the difference — **A/R - Collected** when the customer pays down
  utang, or an extra **A/R - Unpaid Sale** if a payment is reversed. It no-ops until the order's Sales row
  is posted, and is idempotent (matching books post nothing). Called by `postOrderSale` (initial utang)
  and automatically by `recordPayment` (collections). *Why:* one place owns the double-entry so the books
  can't drift from the order; keeps `recordPayment` book-accurate without a manual collection step.
  **Delivery-fee income** now posts to Other Income (no dedicated delivery-income account; 0 in all
  current data, so no oracle impact). `lib/books/posting.ts` is a plain server-only module (not
  `"use server"`) so these helpers are never exposed as callable action endpoints.

## Inferred from the spreadsheets (verify against the files)
- **Milling recovery default 0.62** kg rice per kg palay; **default price ₱60/kg**; **mill 1 day before
  delivery**. *Source:* `Rice_Orders.xlsx` Dashboard SETTINGS.
- **Chart of accounts (~26 titles) and their categories/cash direction.** *Source:* `FDD_Books_of_Account.xlsx`
  → "Books of Account Guide".
- **The source balance sheet is flagged "NOT balanced — check entries"** → the app must fix this, not
  replicate it. *Source:* monthly sheets' "Check" cell.
