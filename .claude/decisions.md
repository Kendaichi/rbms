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

## Milestone 9 — Enhanced RBMS (2026-10-16)
- **Admin is a client-data app; storefront stays SSR.** The admin back-office reads a browser-side
  **Zustand** cache (`lib/store/admin-store.ts`) hydrated once per session by the browser Supabase client
  and kept live by **Supabase Realtime** (`components/admin/admin-data-provider.tsx`, one channel over all
  admin tables). *Why:* the owner wanted navigation to not refetch and to support realtime; a provider in
  `app/admin/layout.tsx` persists the cache + channel across tab navigations. **This reverses the admin
  half of the earlier "standard SSR" decision** above; the storefront (public, SEO-ish, anon) stays SSR.
  Mutations remain zod-validated Server Actions; Realtime pushes the change back into every open client's
  store, so client lists no longer rely on `revalidatePath`.
- **Dashboard/customer/inventory figures are recomputed client-side** from the cached base tables
  (`lib/store/selectors.ts`), kept in lock-step with the SQL views, so they stay live and still match the
  oracle. The heavy **Books reports stay SSR** over the SQL views (income statement/balance sheet/
  depreciation/year) — only the Journal gained client CRUD; replicating the accounting views client-side
  was judged too risky vs. the balanced-sheet oracle.
- **Realtime enablement is a new append-only migration** (`…130000_realtime.sql`: publication +
  `replica identity full`). *Why:* append-only rule; owner applies in SQL Editor. Without it, fetch-on-load
  still works — only live push needs it.
- **Ledger-safe deletes.** Orders are Cancelled (soft) or hard-deleted only with **no posted books entry**;
  customers/batches/runs/transactions get **guarded** hard-delete (blocked when dependents exist). *Why:*
  protect the journal/balance sheet from desync. Deleting an auto-posted transaction re-reconciles A/R.
- **Order edits freeze financials after Pending.** kg/price/fee/customer editable only while `Pending`;
  delivery details + notes always. *Why:* resolve-and-freeze — milled/delivered/posted figures must not shift.
- **Charts are hand-rolled dependency-free SVG** (`components/charts/*`) on the validated status palette
  (dataviz skill). *Why:* avoids a charting-lib peer-dependency with React 19 / Next 16 / Turbopack and
  stays fully theme-aware. Status donut palette validated via the dataviz validator (distinct, CVD-separated).
- **Logo = adaptive grain seal** (`components/brand/logo.tsx`): disc is `currentColor`, the rice grain is
  negative space, so one component reads on cream / sage / dark / forest surfaces. *Why:* a filled two-tone
  mark can't survive arbitrary backgrounds or one-colour; negative space + a gold accent ring does. Favicon
  (`app/icon.svg`) is a simplified solid cut for 16 px. Built via the logo-design skill.
- **Storefront follows the taste-skill one-motif direction** (rice grain) with the live price calculator as
  the one interactive thing. *Follow-ups logged:* real field/palay photography to meet the imagery floor,
  and the taste-skill inspect/motion loop.
