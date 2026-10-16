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
- **Owner vs Staff is a real privilege split, not just a label** (2026-10-16; owner choice). Added
  `is_owner()`; **books** (transactions/accounts/ppe_items/monthly_inventory) and **settings writes** are
  owner-only, as is **costing** and the **Users** page; **profiles** role changes are owner-only
  (`profiles_owner_all` + `profiles_self_read`). Staff keep operations (orders, customers, deliveries,
  inventory). *Why:* the owner wanted helpers who run day-to-day work without reaching the financials or
  pricing. Migration `20261016140000_owner_staff_split.sql` also **closed an escalation hole** — the old
  `profiles_staff_all` policy let any staff set their own role to owner. Nav items are hidden for staff and
  each owner-only route calls `requireOwner()` (defense in depth; RLS is still the real boundary). Trade-off:
  a staff-recorded payment can't auto-reconcile A/R (books are owner-only) — accepted as best-effort.
- **Access is per-user page grants, not fixed role capability** (2026-10-17; owner choice, supersedes the
  owner-only lists above). `profiles.page_access text[]`; owners implicitly have all pages. RLS switched
  from `is_owner()` to `has_any_page(array[...])` per table (migration `20261016150000_page_access.sql`).
  Enforced in three layers off one registry (`lib/admin/pages.ts`): the **proxy** gates `/admin/*` by path
  (works for the client-rendered pages), server guards `requirePage()`/`requireOwner()`, and nav visibility.
  *Why:* the owner wanted to hand specific pages (even Books/Settings) to individual helpers. **Users is the
  one non-grantable page** — granting it equals self-escalation. Staff with zero pages land on
  `/admin/no-access` (prevents a redirect loop). **App code reads `page_access`, so if this migration is not
  applied, every `/admin` request redirect-loops to `/login`.**
- **Customer role removed; owner provisions users** (2026-10-17; owner choice). Roles are owner/staff only.
  New auth users default to staff with no pages; **public sign-up must be turned off in Supabase** so the
  only account creator is the owner's `/admin/users` "Add user" flow, which uses a **service-role client**
  (`SUPABASE_SERVICE_ROLE_KEY`, server-only) — a deliberate, scoped reversal of the earlier "no service-role
  key anywhere" stance (auth-user create/delete only). *Why:* the storefront is guest-based, so a customer
  login role was dead weight, and the owner wanted to add staff directly instead of asking them to self-register.
- **Audit log is DB-trigger based, not app-level** (2026-10-17; owner asked for a "full auditable log").
  Migration `20261016160000_audit_log.sql`: a generic SECURITY DEFINER `audit_trigger()` on every business
  table writes to an append-only `audit_log` (actor id + profile name, action, table, row id, old/new jsonb,
  changed fields). *Why:* triggers capture ALL writes — server actions, the storefront RPC, the service-role
  admin client — and can't be bypassed or forgotten the way per-action logging can. Trade-off: writes by the
  storefront RPC and the service-role client record actor = NULL ("System"), since `auth.uid()` is null there;
  accepted. `audit_log` is owner-only read with no write grants/policies, so the trail is immutable (only the
  definer trigger writes). Viewer `/admin/audit` is owner-only (not grantable) — it exposes every record's
  before/after.
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
- **Batch recovery is derived from actual milling, not planned** (2026-10-17; owner choice). Dropped
  `palay_batches.milling_method`, `milling_recovery`, and the generated `expected_rice_kg` / `cost_per_kg_rice`
  (migration `20261016190000`). Recovery (rice÷palay) and cost-per-kg-of-rice are now computed in the app from
  `milling_runs` linked to the batch — overall and per batch. Added `palay_batches.sacks` (informational; the
  owner enters sacks AND total kg, and `kg_purchased` stays the cost/price basis). *Why:* the planned 0.62 on
  the batch confused the owner into thinking rice output was auto-estimated; real recovery only exists once
  palay is milled. NOTE: `settings.milling_recovery` and `orders.milling_recovery` are unrelated (order
  palay-to-mill planning) and were left intact.
- **Journal refs auto-number by account** (2026-10-17; owner asked for automatic ref numbers "PPE#").
  `accounts.ref_prefix` + a BEFORE INSERT trigger fill `transactions.txn_no` = `<prefix><max+1>` when blank
  (migration `20261016180000`); a supplied value wins, so posted sales keep the order_no. *Why:* matches the
  working-paper convention (C01, PPE01, PP01) and removes manual ref typing. Numbering is max-suffix+1, not a
  DB sequence — simpler, single-owner safe, and tolerant of the historical mixed refs in the seed; accepted
  that it isn't gap-free and isn't safe for concurrent same-prefix bulk inserts (no code path does that).
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
