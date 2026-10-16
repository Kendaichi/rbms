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

## 2026-10-16 — Post-M9 fixes: Realtime auth, Contact page, footer credit
- **Realtime fix (root cause).** Admin tables are RLS staff-only, so Realtime only sends changes to an
  **authenticated** socket. The provider subscribed on mount *before* the cookie session restored → the
  socket joined as **anon** → zero changes (looked like "realtime is dead"; also blocked same-tab updates
  since the UI reads only the cache). `components/admin/admin-data-provider.tsx` now `await getSession()` +
  `supabase.realtime.setAuth(token)` **before** subscribing, re-auths on `onAuthStateChange`, and logs
  `[RBMS realtime] subscription CHANNEL_ERROR/TIMED_OUT`. Owner to re-test after a hard refresh.
- **Write safety net (done).** `lib/store/useCollection.ts` adds `backgroundRefetch`/`refetchCollections` —
  a **no-skeleton** background refresh (updates rows in place, ignores errors). Every admin write calls it on
  success (`refetchCollections("orders")`, etc. in order/customer/inventory/delivery forms + row actions), so
  the acting tab reflects the change instantly even if its Realtime event is slow/dropped; Realtime still
  drives live cross-tab updates.
- **Contact / reseller supply.** New `app/(store)/contact/page.tsx` ("Reselling or buying in bulk?") — call/
  text CTAs to **0949 700 2952** (`lib/contact.ts` holds the details; set `CONTACT.email` when the business
  email exists and the mailto lights up automatically). Linked from the store nav, footer, landing CTA, and a
  new **home-page "Supplying resellers & bulk buyers" section** (pitch + grain bullets + a "Get a reseller
  quote" card with the tap-to-call number + Contact button).
- **Footer credit:** "Website by **daggerbuilds**" → https://www.daggerbuilds.com (new tab) in the store footer.

## 2026-10-16 — Milestone 9: Enhanced RBMS — BUILT (owner verification + 1 migration pending)
> Plan + rationale: the "PLANNED" entry below and `.claude/decisions.md` → "Milestone 9". `npm run build`
> + `npx eslint .` both clean (21 routes). Storefront, login and route-guards verified live; authenticated
> admin + Realtime need the owner account and the new migration (owner-driven, like M2/M4).

**OWNER ACTIONS (one-time):**
1. **Apply `supabase/migrations/20261016130000_realtime.sql`** in the SQL Editor (enables Supabase Realtime
   for the admin cache: publication + `replica identity full`). Without it, data still loads on first visit;
   only live cross-tab updates need it. RLS already filters it to staff.
2. Owner account (if not done): the M4 setup steps still apply (add user + promote to `owner`).

**What shipped**
- **Client data layer + Realtime (the backbone):** admin pages are now client components reading a **Zustand**
  cache (`lib/store/{admin-store,useCollection,selectors,toast}.ts`) hydrated once and kept live by one
  Realtime channel (`components/admin/admin-data-provider.tsx`, mounted in the persistent admin layout).
  Navigating tabs no longer refetches; edits in one tab appear live in others. Server Actions still do the
  writes. **Loading states:** `components/ui/skeleton.tsx` + `components/admin/skeletons.tsx`, a `DataState`
  gate, and `app/admin/loading.tsx` + `app/(store)/loading.tsx`.
- **Orders — full CRUD + visible actions (fixes the original complaint):** inline per-row **Mill / Deliver**
  buttons + a kebab (mark milled/delivered, **undo milling / undo delivery** [added per owner], record
  payment, edit, cancel/reopen, delete). **In-tab "New order"** form with customer-pick-or-create. Guarded
  delete (posted→cancel-only); Pending-only financial edits. Status filter chips + search.
  `app/admin/orders/*`, actions in `app/actions/admin.ts` (`createOrder/updateOrder/deleteOrder`, undo-aware
  `updateOrderStatus`), `lib/validation/admin-order.ts`.
- **Customers CRUD** (create/edit/guarded-delete; live rollups from orders), **Inventory** batch/run
  **edit+delete** (guarded) as dialogs, **Books Journal** transaction **edit+delete** (auto-posted rows
  delete=un-post + re-reconcile A/R), **Deliveries** inline Mill/Deliver quick actions.
- **Dashboard — holistic:** KPI cards w/ sparkline, hand-rolled SVG charts (`components/charts/*`: sales
  area, status donut on a dataviz-validated palette, top-customers + next-7 bars), a month **schedule
  calendar** (`components/admin/schedule-calendar.tsx`, deliveries + mill-by, status dots, links), recent
  orders, New-order. All derived from the live cache.
- **Premium green/gold redesign (impeccable + taste-skill + dataviz):** new primitives — `Badge`, `Dialog`
  (bottom-sheet on mobile), `DropdownMenu` (portal, container-escaping), `ResponsiveTable` (table → stacked
  cards on phones), `ConfirmDialog`, `Toaster`, `Field`, `StatCard`, `PageHeader`. **Mobile-friendly:** admin
  **drawer nav** (`admin-shell.tsx`; there was none before), responsive tables/grids, themed scrollbars/
  selection/tabular-nums in `globals.css`. **Storefront** rebuilt on the taste-skill *one-motif* (rice grain)
  direction with a **live price calculator** (`components/store/*`), forest-green hero, how-it-works/about/
  faq/cta, premium footer.
- **Logo — SVG identity (logo-design skill):** adaptive grain-seal `components/brand/logo.tsx`
  (`LogoMark`/`LogoLockup`; currentColor disc + negative-space grain → reads on any surface) + deliverables
  `public/logo-mark.svg`, `logo-reversed.svg`, `logo-mono.svg`, favicon `app/icon.svg` (+regenerated
  `app/icon.png`). Wired into admin shell, store header/footer, login. Old `tab-icon.webp`/`logo.webp` now
  unreferenced (safe to delete).

**Verified (no creds):** `npm run build` + eslint clean; `/`, `/order`, `/track`, `/login`, `/icon.svg` → 200;
all `/admin/*` → 307 `/login`. Headless-Chrome screenshots confirm the storefront (hero + working calculator)
and login render with the new logo. **Fixed a hydration bug** the owner hit: the `Toaster` portal now renders
client-only via `useSyncExternalStore` (was mismatching server null vs client portal).

**Owner to verify after login + migration:** log in → create an order in Orders → inline Mill/Deliver →
record payment → open a 2nd tab and watch it update **live** → undo delivery/milling → edit/guarded-delete
across tabs → dashboard charts + calendar reflect changes → Books Journal edit/delete and balance sheet stays
balanced → check the admin on a phone (drawer nav + card tables).

**Follow-ups (optional):** storefront real field/palay photography (taste-skill imagery floor) + its inspect/
motion loop; order **detail** page still uses the original `order-actions.tsx` (works, lighter styling);
`supabase gen types` refresh; delete the orphaned `.webp` logo assets.

## 2026-10-16 — Milestone 9: Enhanced RBMS — PLANNED (not yet built)
> Full plan file: `~/.claude/plans/misty-wondering-truffle.md`. This entry is the canonical, detailed record.
> Scope approved by owner via clarifying questions; recorded here before implementation per owner request.

### Why (the gaps this addresses)
1. **Order actions feel missing.** Mark-milled / mark-delivered / cancel / record-payment exist **only on the order
   detail page** (`/admin/orders/[id]`), reached by clicking an order number. The Orders *tab* is a read-only table,
   so from the tab it looks like there's nothing to act on.
2. **Tabs are mostly read-only.** Customers/Deliveries are view-only; Inventory/Books can add but not edit/delete;
   **orders can only be created from the public storefront**, never by staff in the back-office.
3. **Dashboard is flat** (stat tiles only), UI is utilitarian, the **logo is a raster `.webp`**, and the admin is
   **not usable on a phone** (sidebar is `hidden md:flex` with *no* mobile nav; every tab is a wide HTML table).

### Owner-confirmed decisions (this session)
- Redesign scope: **admin + storefront**. Direction: **premium, keep the forest-green/gold identity**.
- Logo: **refresh into a clean SVG identity set** (mark + wordmark + reversed + favicon), keep rice/green/gold.
- Deletes: **ledger-safe** — orders are Cancelled (soft) or hard-deleted only when they have **no posted books
  entry**; customers/batches/runs/transactions get **guarded** hard-delete.
- Data layer: **Zustand store + Supabase Realtime** (browser-side) so tab navigation reads from cache (instant, no
  refetch on redirect) and rows update live. Mutations stay as server actions; Realtime pushes changes into the store.
- Extra asks captured mid-session: **loading states/skeletons**, a **dashboard calendar**, **mobile-friendly** everywhere.
- **New ADR to record**: reverses the *admin* half of the "standard SSR" decision — storefront stays SSR; **admin
  becomes a client-data app** behind the existing server-side auth guard.

### Architecture — client cache + realtime (backbone everything sits on)
Admin list/detail pages become **client components** reading a Zustand store instead of fetching per request. Server
`app/admin/layout.tsx` keeps auth (`getUser` + role check) and renders a new client **`AdminDataProvider`** around
`children`; because a layout doesn't remount on child navigation, its Realtime channels + cache **persist across tab
switches** (the "don't refetch on redirect" behavior requested).
- **`lib/store/admin-store.ts`** — Zustand store, one entry per collection (`orders, customers, palayBatches,
  millingRuns, transactions, accounts, ppeItems, monthlyInventory, settings, products`), each
  `{ rows, status: 'idle'|'loading'|'ready'|'error', error }` + reducers (`setRows`, `upsertRow`, `removeRow`).
- **`lib/store/useCollection.ts`** — hook returning a collection; if `status==='idle'` triggers a one-time fetch via
  the **browser** client (`lib/supabase/client.ts` → `createClient()`, RLS-scoped). Cached after; Realtime refreshes.
- **`components/admin/admin-data-provider.tsx`** — opens **one Realtime channel** on `postgres_changes`
  (INSERT/UPDATE/DELETE) for all admin tables → `upsertRow`/`removeRow`. Tears down on unmount.
- **Mutations**: keep existing server actions (validation + session); drop `revalidatePath` reliance for client lists
  (Realtime updates every open client). Light optimistic `upsertRow` on the acting client; Realtime reconciles.
- **Dashboard** derives from the same cached collections via selectors → instant + live.

**Migration (append-only, new file) `supabase/migrations/2026……_realtime.sql`:** `alter publication supabase_realtime
add table …` for the admin tables; `alter table … replica identity full` on mutable tables so UPDATE/DELETE payloads
carry the row id. Realtime enforces RLS (non-staff receive nothing). **Owner applies it in the SQL Editor.** Without it,
fetch-on-load still works; only live push needs it.

**Loading states:** `components/ui/skeleton.tsx` + composed `TableSkeleton`/`CardSkeleton`/`ChartSkeleton`/`StatSkeleton`;
client pages show skeletons while `loading`/`idle`, friendly empties when `ready`+empty, inline error+retry on `error`;
route-level `app/admin/loading.tsx` + `app/(store)/loading.tsx`. Add `zustand` dependency.

### Work by area
**A. Orders — full CRUD + visible actions**
- *Create in-tab:* "New order" form (modal/sheet; full-screen on mobile) — pick existing customer or new
  (name/contact/barangay/address), kg, price/kg (prefill `settings`, editable), fulfillment, delivery
  date/time-slot/address, delivery fee, notes. New `createOrder` action writes straight to `orders` (staff RLS;
  **`orders_resolve()` trigger** auto-numbers ORD-### + freezes price/recovery/mill_by; `source='admin'`; no RPC).
- *Inline row actions:* Mark milled / Mark delivered / Record payment / Cancel / Edit / Delete (reuse
  `updateOrderStatus` + `recordPayment` in `app/actions/admin.ts`). Fixes "no functions in the tab." Detail page keeps
  the fuller `OrderActions`.
- *Edit:* financial fields (kg, price, fee, customer) editable **only while `Pending`**; delivery info/notes anytime
  (`updateOrder`).
- *Delete (guarded):* `deleteOrder` only when no `transactions.related_order_id`; else UI offers **Cancel**. Confirm dialog.
- Validation: `lib/validation/admin-order.ts` + `lib/validation/customer.ts`.

**B. Customers — full CRUD:** create/edit (`upsertCustomer`); list keeps `customer_summary` rollups but rows become
actionable (edit / view orders / delete). `deleteCustomer` blocked if the customer has orders (offer keep/anonymise).

**C. Inventory — add (exists) + edit/delete:** `updateBatch`/`deleteBatch` (block delete if linked milling runs or a
posted `related_batch_id` txn), `updateMillingRun`/`deleteMillingRun` in `app/actions/inventory.ts`; row actions on both tables.

**D. Books — add (exists) + delete/edit:** `deleteTransaction` (confirm; deleting an auto-posted row = un-posting, with
warning) + `updateTransaction` for manual entries in `app/actions/books.ts`. Keep A/R reconcile (`lib/books/posting.ts`).

**E. Deliveries — quick actions:** keep the schedule; add per-row Mark milled / Mark delivered.

**F. Dashboard — holistic, charts + calendar**
- KPI row (sales, collected, unpaid/utang, pending) as refined cards with trend sparklines.
- Charts: hand-rolled dependency-free responsive SVG in `components/charts/` using existing `--chart-1..5` (dataviz
  skill): `area` (sales/orders by month), `donut` (status mix), `bar` (top customers / deliveries next 7), inventory
  palay-vs-rice bar. Aria-labelled, theme-aware, fed from cached collections.
- **Calendar** `components/admin/schedule-calendar.tsx`: month grid plotting deliveries (`delivery_date`) + mill-by
  dates, status-dotted, cells link to the order, today highlighted, Asia/Manila; built from the orders collection.
- Recent-orders compact live table + "New order" button.

**G. Redesign — premium green/gold (design skills):** apply **impeccable** to admin/dashboard/forms, **taste-skill** to
storefront, **dataviz** to charts. Keep `app/globals.css` palette; raise execution. Shared primitives: use existing
`components/ui/card.tsx`; add `badge`, `dialog`/sheet, `dropdown-menu`, `skeleton`, `separator`, a `ResponsiveTable`
(follow repo's base-nova/Base-UI note — prefer native `<select>` + simple Base-UI popovers over base-nova Select).
Consistent headers/rhythm, **lucide-react** icons (installed), subtle **tw-animate-css** motion (imported), refined
`StatusBadge`, proper empty/error/loading states. Storefront: elevate hero/order/track, header/footer with new logo.

**H. Mobile-friendly:** admin **mobile drawer nav** (top bar + hamburger `< md`; none today); `ResponsiveTable` → normal
table `md+`, **stacked labeled cards on mobile** (Orders/Customers/Deliveries/Inventory/Books); responsive dashboard
grids; full-width forms; modals → full-screen sheets on mobile; tap targets ≥ 40px. Verify at 375px incl. storefront.

**I. Logo — SVG identity set (logo-design skill):** pipeline brief → concept → geometric SVG → optical refinement →
test sheet → variants; keep rice-grain + green/gold. Deliver `public/logo.svg` (combination), `public/logo-mark.svg`,
`public/logo-wordmark.svg`, `public/logo-reversed.svg`, favicon via **`app/icon.svg`** (replace 256-px `app/icon.png`),
optional `app/apple-icon.png`. Update refs in `app/admin/layout.tsx`, `app/(store)/layout.tsx`, `app/(store)/page.tsx`,
root metadata; retire `logo.webp`/`tab-icon.webp` after swap.

**J. Settings/products (minor):** confirm Settings fits the new store/loading model; optionally expose product
active/price inline (low priority).

### Representative files
- **New:** `lib/store/admin-store.ts`, `lib/store/useCollection.ts`, `components/admin/admin-data-provider.tsx`,
  `components/ui/skeleton.tsx`, `components/admin/responsive-table.tsx`, `components/admin/schedule-calendar.tsx`,
  `components/charts/{area,bar,donut,sparkline}.tsx`, `app/admin/loading.tsx`, `app/(store)/loading.tsx`,
  `app/admin/orders/order-form.tsx` (+ customer picker), `lib/validation/{admin-order,customer}.ts`, the realtime
  migration, SVG logo files.
- **Modified (pattern — list pages → client + store + skeletons + row actions + responsive):**
  `app/admin/{dashboard,orders,customers,deliveries,inventory,books}/…`, `components/admin/{admin-nav,status-badge}.tsx`,
  `app/admin/layout.tsx`; `app/actions/{admin,inventory,books}.ts`; storefront + `globals.css` polish.
- **Docs (session-end):** new ADR in `.claude/decisions.md` (client cache + realtime); update `.claude/data-model.md`
  (realtime publication) + this `handoff.md`.

### Verification
- `npm run build` + `npm run lint` clean after each phase.
- *Self-verifiable (no creds):* drive storefront (place→track) + `/login` at desktop **and 375px** via Playwright;
  screenshot new logo, redesigned pages, mobile drawer, loading skeletons; confirm all `/admin/*` still 307→`/login`
  unauthenticated.
- *Needs owner account + realtime migration applied:* log in → create order in Orders tab → inline mark
  milled/delivered → record payment → watch a 2nd tab update **live** → edit/delete guarded paths → confirm dashboard
  charts/calendar + Books balance. Checklist to be provided; if owner shares a throwaway login, drive end-to-end via Playwright.

### Risks / tradeoffs
- Client-data pivot trades SSR first-paint for cached+live navigation; needs realtime migration for live push (recorded
  as ADR). Hand-rolled SVG charts avoid React-19/Turbopack peer-dep risk and stay themeable. Large scope → land in phase
  order A→I, build green at each step, update `handoff.md` as it goes.

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
