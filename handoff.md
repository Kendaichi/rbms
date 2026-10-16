# Handoff — Rice Business Management System (RBMS)

## PLAN (in flight) — full build roadmap
> Full approved plan: `~/.claude/plans/hey-in-my-working-scalable-dream.md`. Summary below.

**Goal:** Replace three Excel working papers (Costing, Orders, Books of Account) with one Next.js +
Supabase web app, and add a customer-facing online store. The three domains stay connected:
**Costing → Orders → Books of Account**.

**Locked decisions:** full system in one build · guest checkout + optional account · manual payment +
utang (no gateway) · one product (NSIC Rc 160) ordered by the kilo. (Rationale in `.claude/decisions.md`.)

**Stack (as built):** Next.js **16.4.1** (App Router, Server Actions, Turbopack), React 19.3, TypeScript,
Tailwind v4 + shadcn/ui (base-nova / Base UI), Supabase (Postgres/Auth/RLS/Storage). Locale en-PH, ₱,
Asia/Manila. Money as integer centavos.

**Environment decision (2026-10-15):** Supabase runs on **Supabase Cloud** (not local Docker). Migrations
applied via the Supabase CLI (`supabase link` + `supabase db push`) or the dashboard SQL Editor.

**Milestones (status):**
- [x] **0 — Claude project setup** — CLAUDE.md + `.claude/` knowledge base + handoff. ✅ done 2026-10-15.
      **→ CHECKPOINT: paused for review before Milestone 1.**
- [x] **1 — Scaffold** — Next.js 16.4.1 (App Router, Turbopack) + Tailwind v4 + shadcn/ui (base-nova) +
      `@supabase/ssr` wiring (client/server/proxy) + env config. ✅ done 2026-10-15; build + routes verified.
- [x] **2 — Schema + seed** — 11 tables + views + RLS + seed. ✅ applied via SQL Editor & verified by
      owner 2026-10-16 (settings/products confirmed via anon; orders RLS-blocked for anon).
- [x] **3 — Storefront** — landing + product, guest order form → `place_order()`, tracking via
      `track_order()`. Brand palette from logo; webp assets + favicon. ✅ done & verified end-to-end
      2026-10-16 (place_order → ORD-###; track_order returns ORD-001 w/ mill_by 2026-10-24). Optional
      customer email account deferred to M4 auth.
- [~] **4 — Admin shell + orders** (built 2026-10-16; auth guard verified, logged-in experience pending
      owner account) — login + role-gated admin, dashboard KPIs, orders list/detail with lifecycle +
      payment recording, customers summary. Needs owner-account setup (see latest journal entry).
- [~] **5 — Deliveries & inventory** (built 2026-10-16; guard verified, CRUD by owner after login) —
      delivery schedule (7-day + overdue + mill-by), palay batches, milling runs, palay/rice on-hand.
- [x] **6 — Costing** — cost-sheet calculator (pay-a-mill vs own-miller, break-even, miller ROI).
      ✅ built 2026-10-16; `lib/calc/costing.ts` verified against the sheet (all figures match).
      "Save scenario as palay_batch" deferred (calculator links to Inventory → Add batch).
- [x] **7 — Books of account** — journal (ledger + manual entry + owner-confirmed auto-posting), monthly
      Income Statement / COGS / OpEx, Balance Sheet (balanced badge), Depreciation Schedule, Year Summary.
      ✅ built 2026-10-16; `npm run build` clean, all 5 `/admin/books/*` routes guard to `/login`. Runs
      over the existing M2 SQL views — no new migration. Logged-in verification + auto-post test pending owner.
- [ ] **8 — Harden & deploy** — RLS review, empty/edge states, deploy to Vercel + Supabase Cloud.

**Verification (spreadsheets are the oracle):** after seeding, expect 5 pending orders / 275 kg /
₱16,500 sales / ₱16,500 unpaid; palay on hand 4118 kg; palay-to-mill ≈443.5 kg. Costing (4118 kg @ ₱22,
recovery 0.62): pay-a-mill cost/kg ≈₱45.42, rice ≈2553 kg; own-miller ≈₱40.58. Books (Oct 2026): COGS
91,396, net profit ≈−₱91,534.81, monthly depreciation ≈₱138.81. The balance sheet must actually balance.

---

## (ARCHIVED) Milestone 2 detailed plan — done & superseded; current status is in the journal below

**Prerequisites (owner provides):**
- Create a Supabase Cloud project (region near PH, e.g. Singapore); set and keep the DB password.
- Put three values in `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to share), `SUPABASE_SERVICE_ROLE_KEY` (**secret** — owner edits
  the file directly, e.g. `! notepad .env.local`; do not paste it into chat).
- Note the **project ref** (from the project URL) for `supabase link`.

**Work — creds-free (can be drafted before the project exists):**
1. `supabase init` → `supabase/config.toml` + `supabase/migrations/`. Add `supabase` CLI as a devDependency.
2. Migration `0001_init.sql` — the **11 tables** with constraints:
   - `profiles` (id = auth.uid, role owner|staff, name)
   - `settings` (singleton: default_price_per_kg=60, milling_recovery=0.62, mill_days_before_delivery=1, business info)
   - `products` (name, slug, unit 'kg', price_per_kg, is_active, image_url) — seed NSIC Rc 160
   - `customers` (name, contact_no, address, barangay, customer_type, auth_user_id?, notes)
   - `orders` (order_no ORD-###, customer_id, order_date, fulfillment_type, delivery_address, delivery_date,
     time_slot, mill_by*, kg_ordered, price_per_kg*, delivery_fee, amount_paid, payment_status, status,
     milled_on, delivered_on, palay_to_mill_kg*, source, notes) — `*` = resolved-and-frozen at write time
   - `palay_batches`, `milling_runs`, `accounts`, `transactions`, `ppe_items`, `monthly_inventory`
   - Money as integer centavos (or numeric); enums via CHECK constraints / Postgres enums.
3. Migration `0002_views.sql` — computed **views**: order totals (rice_amount / total_due / balance),
   customer rollups, dashboard aggregates, income statement / COGS / balance sheet / year summary.
4. Migration `0003_rls.sql` — **RLS**: admin tables staff-only (`profiles.role in ('owner','staff')`);
   customers read only their own orders; anon has **no** table write policies — guest checkout goes
   through a Server Action (service-role server client) or a `place_order` SECURITY DEFINER function.
5. `supabase/seed.sql` — chart of accounts (~26 titles from the Books Guide), product, settings, PPE
   (mini miller 15,000 / sack sealer 2,534), and **demo data from the sheets**: 5 customers, 5 orders
   (ORD-001..005), October transactions (Capital 100,000; PPE 15,000+2,534+450; Packaging 800; Palay 90,596).
6. `lib/types/database.ts` via `supabase gen types typescript` (after schema is applied).

**APPLY (owner action required — DDL needs the DB password or the SQL Editor; the anon key cannot
create tables). Pick one:**
- **Option A — Supabase CLI (recommended; applies all 3 migrations in order).** Run via the `!` prefix so
  prompts work in the terminal (`link` asks for the project's DB password set at creation):
  - `! npx supabase link --project-ref fqwkxnwoboobreenzpxd`
  - `! npx supabase db push`
  - then paste `supabase/seed.sql` into the dashboard SQL Editor and run it.
- **Option B — SQL Editor only (no password, no CLI).** In the dashboard SQL Editor, paste + run in order:
  `20261015100001_init.sql` → `…100002_views.sql` → `…100003_rls.sql` → `seed.sql`.
  (SQL-Editor applies won't register in `supabase_migrations`; repair later if we adopt CLI pushes.)
- Optional: offer to bundle the 3 migrations + seed into one `apply_all.sql` for a single paste.

**VERIFY:** paste `supabase/verify.sql` into the SQL Editor — it returns 13 rows of expected vs actual.
Key checks: `pending_orders=5`, `total_sales=16500.00`, `palay_on_hand=4118`, `palay_to_mill_pending=443.548`,
`oct_cogs=91396.00`, `oct_net_profit=-91534.81`, `oct_depreciation=138.8108`, and **`bs_is_balanced=true`**
(cash −9,380; total assets = total L+E = **₱8,465.19**). The workbook's own balance sheet did NOT balance;
ours does. After verifying, regenerate `lib/types/database.ts` and mark Milestone 2 done.

**Chore carried from M1:** add `!.env.example` to `.gitignore` when git is initialized.

---

## NEXT UP — Milestone 8: Deploy runbook (owner-driven; code side is done)

Hardening + the deferred books refinements are **done** (see the M8 journal entry below). What remains is
the actual deploy, which needs the owner's GitHub + Vercel accounts. Runbook:

1. **Git** (repo not yet initialized): `! git init` → ensure `.gitignore` ignores `.env*` **and** keeps
   `!.env.example` (chore carried from M1) → first commit → push to a new GitHub repo (`! gh repo create`).
   Confirm `.env.local` is NOT committed (the anon key is public-safe, but keep secrets out by habit).
2. **Vercel**: New Project → import the GitHub repo (Next.js auto-detected; build `next build`).
   Add env vars **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (values from
   `.env.local`) for Production + Preview. No service-role key is used anywhere, so none is needed.
3. **Supabase**: add the Vercel prod + preview URLs to Auth → URL Configuration (Site URL / redirect
   allow-list) so admin login works off-localhost. RLS already applied (M2/M4) — nothing to change.
4. **Smoke in prod**: storefront `/` shows live ₱/NSIC Rc 160; place a test order → `track` it; log in at
   `/login` (owner account from M4 setup) and click through admin incl. all 5 books tabs; delete the test order.

**Still optional / later:** `supabase gen types typescript` refresh of `lib/types/database.ts`
(books/actions use local row types + `as unknown as`, so builds are clean without it); auto-reversal of
books entries when a posted order is Cancelled (currently manual). (`/admin/settings` is now built.)

---

## 2026-10-16 — Git initialized + Settings page built
- **Git**: `git init -b main` with remote `origin` = `https://github.com/Kendaichi/rbms.git`. **No commits
  made** (owner will commit). `.gitignore` fixed — `!.env.example` now tracked (M1 chore cleared);
  `.env.local` + `.claude/settings.local.json` confirmed ignored via `git check-ignore`.
- **Settings page** (`/admin/settings`): edits the singleton `settings` row — business name, selling price
  (₱/kg), milling recovery, mill-days-before-delivery. Saving also syncs the `nsic-rc-160` product price so
  the storefront stays aligned. Resolve-and-freeze preserved: changing settings never touches existing
  orders. Files: `lib/validation/settings.ts`, `app/actions/settings.ts`,
  `app/admin/settings/{page,settings-form}.tsx`; Settings nav flipped to ready. `npm run build` clean;
  `/admin/settings` → 307 `/login` unauthenticated. Logged-in edit pending owner.
- This clears the "optional `/admin/settings`" item from the M8 runbook. Remaining M8 = owner-driven deploy.

## 2026-10-16 — Milestone 8: Books refinements + hardening (code) — DONE; deploy pending owner
- **A/R reconcile + delivery income** (deferred from M7): new **`lib/books/posting.ts`** (plain server-only
  module, not `"use server"`, so its helpers aren't exposed as action endpoints) with
  `reconcileOrderReceivable()` + `getAccountIds()` + `round2`/`todayManila`. `postOrderSale` now posts
  Sales (`rice_amount`) + delivery fee → **Other Income** (if charged), then reconciles A/R to the order
  **balance** (`total_due − amount_paid`). `recordPayment` (app/actions/admin.ts) calls the same reconcile
  → posts **A/R - Collected** as utang is paid down (or adds back A/R if a payment is reversed), best-effort
  (payment still saves if reconcile fails). Reconcile no-ops until the Sales row exists and is idempotent
  (matching books post nothing), so repeated saves never double-count. Decisions + CLAUDE Books rule updated.
- **RLS review — no gaps.** `20261016120000_roles.sql` (applied after rls.sql) relaxes `profiles.role` to
  allow `customer`, defaults signups to `customer`, `handle_new_user` inserts `customer` → storefront
  accounts can't reach admin. anon: only `products`/`settings` reads + `place_order`/`track_order`. A
  logged-in customer reads only their own order/customer/profile rows; accounts/transactions/PPE/inventory
  are staff-only; the `security_invoker` books views return 0 rows to non-staff. No service-role key in use.
- **Empty/edge states** confirmed: storefront falls back to defaults with `maybeSingle` + nullish coalescing
  (no crash if product missing/inactive); every admin list + all books reports render friendly empties.
- **Verified (no creds)**: `npm run build` clean (TypeScript OK, 19 routes). The A/R reconcile math is pure
  and traced by hand; owner should exercise it live: mark an order Delivered → post the sale (A/R appears
  for any balance) → record a payment and watch **A/R - Collected** post and the Balance Sheet stay balanced.
- **Next**: owner-driven deploy — see NEXT UP runbook above.

## 2026-10-16 — Milestone 7: Books of account — BUILT
- **What**: `/admin/books` workbook with a sub-nav (Journal · Income Statement · Balance Sheet ·
  Depreciation · Year Summary). All reports read the **existing M2 SQL views** (`monthly_financials`,
  `balance_sheet`, `year_summary`, `depreciation_for_month`/`accumulated_depreciation`) — **no new
  migration**. Enabled the Books item in `components/admin/admin-nav.tsx`.
  - **Journal** (`page.tsx` + `journal-forms.tsx`): ledger (Cash in / Cash out + totals), a manual
    **Add entry** form (account grouped by category via `<optgroup>`), and two **owner-confirmed
    auto-post** panels — delivered orders → Sales (+ A/R-Unpaid for any balance) and palay batches →
    Purchases + processing-cost rows. Idempotent via `transactions.related_order_id`/`related_batch_id`.
  - **Income Statement**: month picker (GET form) over `monthly_financials`; full statement with COGS
    breakdown + **itemised OpEx from transactions** + the auto depreciation line; a set-**ending-inventory**
    form (`monthly_inventory` upsert) that lowers COGS / carries to next month's beginning inventory.
  - **Balance Sheet**: `balance_sheet` view with a Balanced ✓ / NOT balanced badge.
  - **Depreciation**: `ppe_items` schedule; accumulated-to-date + net book value computed in JS with the
    same formula as `accumulated_depreciation()` (Manila "today").
  - **Year Summary**: `year_summary` view, metrics as rows × years as columns.
- **Files**: `lib/validation/books.ts`; `app/actions/books.ts` (`addTransaction`, `setEndingInventory`,
  `postOrderSale`, `postBatchCosts`); `app/admin/books/{layout,books-nav,page,journal-forms}.tsx`,
  `app/admin/books/income-statement/{page,is-forms}.tsx`, `app/admin/books/{balance-sheet,depreciation,
  year}/page.tsx`.
- **Decisions** (see `.claude/decisions.md`): auto-posting is **owner-confirmed + idempotent**, never a
  DB trigger; revenue recognised **on Delivered** (Sales = `rice_amount`; unpaid balance → A/R-Unpaid so
  cash reflects only collections and the sheet stays balanced). A/R collections + delivery-fee income are
  **manual for now** (deferred to M8).
- **Verified (no creds)**: `npm run build` clean (TypeScript OK, 19 routes incl. all 5 books routes);
  runtime — every `/admin/books/*` → **307 `/login`** unauthenticated (shared admin guard; no request-time
  crash). Hand-traced the Oct 2026 oracle through the views: COGS 91,396, net profit −91,534.81, monthly
  depreciation 138.8108, balance sheet balances at **₱8,465.19** (cash −9,380) — all match.
- **Pending owner verification (after login)**: click through the 5 books tabs; mark an order Delivered
  then post its sale (watch A/R appear if unpaid); add a palay batch in Inventory then post its costs;
  set an ending-inventory figure and confirm COGS drops. No migration to apply — books run on M2's views.
- **Next**: Milestone 8 — Harden & deploy (see NEXT UP above).

## 2026-10-16 — Milestone 6: Costing calculator — BUILT & verified
- **What**: `/admin/costing` interactive calculator comparing pay-a-mill vs own mini-miller — break-even
  cost/kg, profit/batch, and miller ROI (extra profit/batch, batches + palay-kg to payback, hours to mill,
  own milling/kg, electricity/hr). Pure engine `lib/calc/costing.ts` (+ `defaultCostingInputs` from the
  sheet); page prefills selling price / recovery from `settings`. Sidebar Costing enabled.
- **Verified**: `lib/calc/costing.ts` checked against the spreadsheet via Node 24 type-stripping — ALL
  pass: mill cost/kg 45.4249, own 40.5753; profit/batch 37,212.6 / 47,994.64; own milling/kg 0.52;
  extra profit 10,782.04; payback 1.39 batches / 5,729 kg; 34.32 hrs; elec 26.4/hr. `npm run build` clean.
- **Notes**: "save scenario as palay_batch" deferred — the calculator links to Inventory → Add batch
  (keeps it a pure planning tool). Guarded under `/admin`. Files: `lib/calc/costing.ts`,
  `app/admin/costing/{page.tsx,costing-calculator.tsx}`.
- **Next**: Milestone 7 — Books of account (journal, monthly Income Statement / COGS / Balance Sheet,
  Year Summary, Depreciation schedule, owner-confirmed auto-posting from orders/batches).

## 2026-10-16 — Milestone 5: Deliveries & Inventory — BUILT
- **Built**: `app/admin/deliveries/page.tsx`; `app/admin/inventory/{page.tsx,inventory-forms.tsx}`;
  `app/actions/inventory.ts` (`addPalayBatch` / `addMillingRun`, staff-only via RLS);
  `lib/validation/inventory.ts`; sidebar Deliveries + Inventory enabled.
- **Verified**: `npm run build` clean (TS OK); `/admin/deliveries` + `/admin/inventory` → 307 `/login`
  when unauthenticated. Logged-in CRUD (add batch / milling run; schedule + stock views) verified by
  owner after login. Zod issue typing kept version-agnostic (no `ZodIssue` import — moved in Zod 4).
- **Plan (as built)**:
  - `/admin/deliveries` — schedule derived from orders (delivery_date set, status not Delivered/Cancelled):
    stat tiles (today / tomorrow / next-7 / overdue) + one "Upcoming & overdue" table sorted by date with
    an Alert badge (Overdue / Today / Tomorrow / Upcoming) and the mill-by date. Read-only; no migration.
  - `/admin/inventory` — stock tiles from `inventory_summary` (palay bought/milled/on-hand, rice
    milled/on-hand) + **palay batches** (add form + list; generated cost/kg of rice) + **milling runs**
    (add form + list; converts palay→rice, drives on-hand).
  - Server actions `app/actions/inventory.ts`: `addPalayBatch`, `addMillingRun` (staff-only via RLS, no
    service role). zod `lib/validation/inventory.ts`. Enable sidebar links for Deliveries + Inventory.
  - "Today" computed in Asia/Manila (`toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })`).
  - **Verify**: build clean; runtime guard (unauth `/admin/*` → `/login`); owner clicks through after login.

## 2026-10-16 — Milestone 4: Admin back-office built (auth, dashboard, orders, customers)
- **What**: Admin shell with Supabase email/password auth + staff-role guard; dashboard KPIs; orders
  list + detail (lifecycle Pending→Milled→Delivered→Cancelled + payment recording); customers summary.
  Security: new auth signups default to `'customer'` (migration 0005) so storefront accounts can never
  reach admin; `is_staff()` gates owner/staff. Sidebar nav lists future sections (deliveries/inventory/
  costing/books/settings) as "soon".
- **Files**: migration `20261016120000_roles.sql`; `app/actions/{auth,admin}.ts`;
  `app/login/{page,login-form}.tsx`; `app/admin/{layout,page}.tsx`, `app/admin/dashboard/page.tsx`,
  `app/admin/orders/{page.tsx,[id]/page.tsx,order-actions.tsx}`, `app/admin/customers/page.tsx`;
  `components/admin/{admin-nav,status-badge}.tsx`.
- **Verified (no creds needed)**: `npm run build` clean; runtime — all `/admin*` → 307 `/login` when
  unauthenticated; `/login` renders (email/password). Logged-in admin needs the owner account (below).
- **OWNER SETUP (one-time, to use the admin)**:
  1. Apply `supabase/migrations/20261016120000_roles.sql` in the SQL Editor.
  2. Dashboard → Authentication → Users → **Add user** (email + password; tick **Auto Confirm User**).
  3. Promote to owner (SQL Editor):
     `update public.profiles set role='owner' where id=(select id from auth.users where email='YOUR_EMAIL');`
  4. `! npm run dev`, open http://localhost:3000/login, sign in.
- **Next**: Milestone 5 — Deliveries schedule + Inventory (palay batches, milling runs, palay/rice on hand).

## 2026-10-16 — Milestone 3 verified COMPLETE
- Owner applied the `track_order` migration and cleaned up the test data. Verified via anon RPC:
  `track_order('ORD-001','9632893032')` returns the real order (Pending, mill_by 2026-10-24, 100 kg);
  the automated test orders (contact 09000000000) now return `[]` (deleted). Write path confirmed
  earlier (`place_order` → ORD-###). Storefront read + write + track all working on live Supabase.
- **Next: Milestone 4 — Admin** (auth guard + staff role, dashboard KPIs, orders lifecycle + payment
  recording, customers with derived totals).

## 2026-10-16 — Milestone 3: Storefront built (landing, order, track)
- **What**: Customer storefront on the logo-derived brand palette (forest green `#2D4320`, gold
  `#EBB21F`, cream `#FAF8EF`; light + dark). Landing reads live product+settings; guest order form posts
  to `place_order()` via a Server Action; tracking via `track_order()`.
- **Files**: `app/globals.css` (brand palette); `app/(store)/layout.tsx`, `app/(store)/page.tsx`
  (hero + live price), `app/(store)/order/{page,order-form}.tsx`, `app/(store)/track/{page,track-form}.tsx`;
  `app/actions/orders.ts` (submitOrder / trackOrder); `lib/validation/order.ts` (zod), `lib/format.ts`
  (peso/kg). shadcn add: input/label/select/radio-group/card/textarea (used Input/Label/Textarea/Button;
  native `<select>`/radios for robustness since base-nova Select/RadioGroup are Base UI).
- **Assets**: `public/logo.webp` (1.29 MB→38 KB), `public/tab-icon.webp` (7 KB), `app/icon.png` (256px
  brand favicon; removed default `favicon.ico`). Pillow 12.3 for extraction + conversion.
- **Decision**: `cacheComponents`/`partialPrefetching` turned OFF (standard SSR) — see decisions.md.
- **Verified**: `npm run build` clean (TypeScript OK). Runtime smoke vs **live Supabase**: `/` shows real
  ₱60.00 + NSIC Rc 160, `/order` + `/track` render, `/icon.png` 200. Read path + env + brand confirmed.
- **NOT yet done / next**:
  - **Apply `supabase/migrations/20261016090001_track_order.sql`** in the SQL Editor — tracking errors until then.
  - Write path (`place_order`) builds + RPC exists but not exercised live (would create ORD-006). Place
    one test order to confirm; cancel/delete it later (admin lands in M4).
  - Optional customer email account deferred to overlap with M4 auth.

## 2026-10-16 — Milestone 2 DONE; Milestone 3 (Storefront) started
- **Milestone 2 applied + verified.** Owner ran the 3 migrations + `seed.sql` via the SQL Editor
  (Option B) after the immutability fix; `verify.sql` succeeded. Confirmed independently via anon REST:
  `settings` (₱60, 0.62, 1 day) and `products` (NSIC Rc 160) seeded; `orders` returns `[]` to anon →
  RLS working as intended.
- **Decision — disabled `cacheComponents` + `partialPrefetching`** in `next.config.ts` (standard SSR).
  RBMS is dominated by request-time dynamic data (live products/orders, forms, auth, dashboards);
  dynamicIO would force Suspense/`"use cache"` everywhere for no benefit here. See `.claude/decisions.md`.
- **New migration — NEEDS APPLYING: `supabase/migrations/20261016090001_track_order.sql`** —
  `track_order(order_no, contact)` SECURITY DEFINER lookup so guests can track an order without a broad
  anon read policy (must know order number AND matching contact). Apply it in the SQL Editor.
- **Milestone 3 build**: landing reads product+settings; guest order form → `place_order()` RPC via a
  Server Action → confirmation with the ORD-### number; `/track` via `track_order()`. Adding shadcn
  form components (input/label/select/radio-group/card/textarea). cacheComponents off removes the
  Suspense/use-cache requirement for these pages.

## 2026-10-16 — Milestone 2 fixes (pre-apply)
- Fixed `42P17 generation expression is not immutable` in `20261015100001_init.sql`: Postgres resolved
  `date_trunc('month', <date>)` to the timezone-dependent (stable) overload inside STORED generated
  columns. Cast the date to `::timestamp` so the immutable overload is used — in `transactions.month`,
  `ppe_items.depreciation_starts`, and `ppe_items.depreciation_ends`. The user hit this running file 1
  in the SQL Editor; re-running the fixed file 1 → 2 → 3 → seed → verify should proceed.
- Normalized `.env.local`: removed the duplicate `NEXT_PUBLIC_SUPABASE_URL` line and the unused
  `SUPABASE_SERVICE_ROLE_KEY` placeholder; kept the anon key (used by the app) + the publishable key.

## 2026-10-15 — Milestone 2 (in progress): schema + seed drafted, Cloud connected
- **What**: Wrote all Milestone 2 SQL (NOT yet applied) and verified the Supabase Cloud connection.
- **Files**: `supabase/config.toml` (supabase init); `supabase/migrations/20261015100001_init.sql`
  (11 tables + order_no sequence + orders_resolve/touch triggers), `…100002_views.sql`
  (depreciation functions + customer_summary, inventory_summary, dashboard_summary, monthly_financials,
  balance_sheet, year_summary — all `security_invoker`), `…100003_rls.sql` (RLS + grants + place_order()
  broker + handle_new_user); `supabase/seed.sql` (26-row chart of accounts + sheet demo data);
  `supabase/verify.sql` (oracle checks). Added `supabase` CLI devDependency; `.env.example` marks the
  service-role key optional.
- **Connection**: project `fqwkxnwoboobreenzpxd` is live; anon + publishable keys both 200 on
  `/auth/v1/settings` and reach PostgREST (PGRST205 = tables not created yet). No service-role key needed.
- **Findings / decisions**:
  - **Fixed the workbook's "NOT balanced" bug**: the sheet omitted capital from cash (showed −109,380).
    Our cash = Σ(IN) − Σ(OUT) = −9,380, so the balance sheet balances to **₱8,465.19** — matching the
    workbook's own Owner's Equity total.
  - Money as `numeric` (exact), kg as `numeric(12,3)`. Order price/recovery/mill_by are resolved-and-frozen
    by `orders_resolve()`; rice_amount/total_due/balance/palay_to_mill are generated columns.
  - Guest checkout = `place_order()` SECURITY DEFINER RPC (anon-callable) → service-role key not required.
  - Supabase new API keys: the legacy anon JWT is rejected only at the REST introspection root
    (`UNAUTHORIZED_INVALID_API_KEY_TYPE`) but works for real table queries; anon + publishable both fine.
- **Gotchas / next**: SQL is drafted but **NOT applied** — DDL needs the DB password or the SQL Editor
  (the anon key cannot create tables). To apply: (A) CLI — `npx supabase link --project-ref
  fqwkxnwoboobreenzpxd` then `npx supabase db push`, then run `seed.sql` in the SQL Editor; or (B) paste
  the 3 migrations + `seed.sql` into the dashboard SQL Editor in order. Then run `supabase/verify.sql` to
  confirm the oracle. SQL-Editor applies won't register in `supabase_migrations` (repair later if we
  adopt CLI pushes).

## 2026-10-15 — Milestone 1: Scaffold (Next.js 16 + Supabase SSR)
- **What**: Scaffolded the app and wired Supabase SSR. **Verified**: `npm run build` (TypeScript +
  static generation clean) and a runtime smoke test — `/`, `/admin`, `/order`, `/track` all return
  HTTP 200 and the proxy session-refresh does not crash with placeholder creds.
- **Files**: `package.json` (+451 deps), `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`,
  `app/layout.tsx` (RBMS metadata, `lang="en-PH"`), `app/(store)/{layout,page}.tsx`,
  `app/(store)/order/page.tsx`, `app/(store)/track/page.tsx`, `app/admin/{layout,page}.tsx`,
  `lib/supabase/{client,server,middleware}.ts`, `proxy.ts`, `components/ui/button.tsx`,
  `components.json`, `lib/utils.ts`, `app/globals.css` (theme), `.env.example`, `.env.local`.
- **Surprises / decisions**:
  - Environment ships **Next.js 16.4.1** (plan assumed 15). Turbopack is the default bundler; **no
    `postcss.config` / `tailwind.config.js`** — Tailwind v4 is wired via `@tailwindcss/turbopack` and
    the theme lives in `app/globals.css`. `.claude/stack.md` updated to the real versions.
  - shadcn style is **base-nova on Base UI** — `Button` has **no `asChild`**; style a `Link` with
    `buttonVariants()` (done on the landing page).
  - Next 16 renamed the `middleware` file convention to **`proxy`** — root is `proxy.ts` exporting
    `proxy()`; `lib/supabase/middleware.ts` keeps the conventional Supabase helper name.
  - `cacheComponents` + `partialPrefetching` are enabled in `next.config.ts`. Fine for static pages;
    once we read cookies/auth, request-time data must sit behind Suspense.
- **Gotchas / next**:
  - `.env.local` holds **placeholder** Supabase creds — nothing connects yet.
  - Default `.gitignore` ignores `.env*` incl. `.env.example`; add `!.env.example` when git is set up.
  - `npm install` reported 5 high-severity **transitive** advisories; not auto-fixed (avoid `--force`).
  - Scaffolded via a temp folder then moved into the root (create-next-app refuses a non-empty dir);
    temp cleaned up. Dropped the generated `AGENTS.md` (CLAUDE.md is canonical).
  - **Next up: Milestone 2 — Schema + seed.** Begin with `supabase init` + local stack (**needs Docker**),
    then migrations for the 11 tables + RLS, then `seed.sql` from the spreadsheets.

## 2026-10-15 — Milestone 0: Claude project setup in place
- **What**: Created the standing rulebook + knowledge base + journal per `claude_setup.md`, before any
  app code, so the setup steers the whole build. No application code written yet.
- **Files**: `CLAUDE.md`; `.claude/architecture.md`, `.claude/stack.md`, `.claude/data-model.md`,
  `.claude/decisions.md`; `handoff.md`; `.claude/settings.local.json`.
- **Context**: Full build plan approved and saved at
  `~/.claude/plans/hey-in-my-working-scalable-dream.md`. Scope and the four locked decisions (one build;
  guest checkout + optional account; manual payment + utang; single product by kg) are recorded in
  `.claude/decisions.md`. Reference working papers (`Rice_Simple_Cost_Sheet (1).xlsx`,
  `Rice_Orders.xlsx`, `FDD_Books_of_Account.xlsx`) are the spec and the numeric test oracle.
- **Verified**: Files created and reviewed for consistency with the plan. Nothing to build/run yet.
- **Gotchas / next**: Per the user's instruction, **paused here for review before Milestone 1
  (Scaffold)**. Milestone 1 = `create-next-app` (TS, App Router, Tailwind) + shadcn/ui + Supabase
  (local CLI) + `@supabase/ssr` wiring + env config. Do not start until the owner gives the go-ahead.
