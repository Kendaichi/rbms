# Rice Business Management System (RBMS) — online store + back-office for a freshly-milled rice business

## Overview
RBMS runs a Philippine freshly-milled rice business (NSIC Rc 160, priced in ₱/kg). It replaces three
Excel working papers — a **costing** sheet, an **orders** workbook, and a full **books of account** —
with one web app, and adds a **customer-facing online store** for ordering. The three domains connect:
**Costing → Orders → Books of Account**. Audience: the owner (admin/back-office) and walk-in/online
customers (storefront).

> Reference working papers live in the project root: `Rice_Simple_Cost_Sheet (1).xlsx`,
> `Rice_Orders.xlsx`, `FDD_Books_of_Account.xlsx`. They are the **spec and the test oracle** — the app
> must reproduce their numbers. The Claude blueprint this setup follows is `claude_setup.md`.

## Stack (high level)
- **Backend / data**: Supabase — Postgres, Auth (email/password), Row Level Security, Storage.
- **Frontend**: Next.js 15 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS, shadcn/ui.
- **Forms/validation**: react-hook-form + zod (schemas shared by Server Actions and client).
- **Deploy**: Vercel (app) + Supabase Cloud; runnable locally via the Supabase CLI.
- See `.claude/stack.md` for exact/target versions and `.claude/architecture.md` for topology.

## Structure
```
app/
  (store)/      # public storefront: landing, order, track, optional customer account
  admin/        # protected back-office: dashboard, orders, customers, deliveries, inventory, costing, books, settings
  actions/      # zod-validated Server Actions
lib/
  supabase/     # server.ts, client.ts, middleware.ts
  calc/         # pure fns ported from the sheets: costing.ts, orders.ts, accounting.ts
  validation/   # zod schemas
  types/        # generated Supabase types
supabase/
  migrations/   # append-only SQL migrations
  seed.sql      # product, settings, chart of accounts, ppe, demo data from the sheets
```

## Current Focus (as of 2026-10)
- **Milestones 0–3 DONE; Milestones 4–7 built** — Claude setup; Next.js **16** / Tailwind v4 / shadcn +
  Supabase SSR; schema + views + RLS + seed on Supabase Cloud; storefront verified end-to-end; admin
  back-office (auth guard verified) with dashboard, orders, customers, deliveries schedule, inventory
  (batches + milling runs), the costing calculator (logic verified vs the sheet), and the **books of
  account** (journal + manual entry + owner-confirmed auto-posting; Income Statement, Balance Sheet,
  Depreciation schedule, Year Summary over the existing SQL views). `cacheComponents` OFF. Logged-in
  admin pending owner-account setup (see handoff). New signups default to `customer`.
- **Milestone 8 code side DONE** — RLS reviewed (no gaps), empty/edge states confirmed, and the deferred
  books refinements landed (`lib/books/posting.ts`: A/R reconciled to order balance on post + on payment;
  delivery fee → Other Income). **Remaining: owner-driven deploy** to Vercel + Supabase Cloud (git init +
  GitHub, Vercel env vars, Supabase auth URL allow-list) — runbook in `handoff.md` NEXT UP.
- Full plan: `~/.claude/plans/hey-in-my-working-scalable-dream.md`; latest: `handoff.md`.

## Rules
- **Palay ≠ rice.** Palay (unmilled) converts to rice via `milling_recovery` (default **0.62** kg rice
  per kg palay). Never mix the two units; always convert explicitly. `palay_to_mill = rice_kg / recovery`.
- **Money is never a float.** Store money as integer centavos (or Postgres `numeric`). All money/qty
  math goes through the pure functions in `lib/calc` — no inline arithmetic in components/actions.
- **Resolve-and-freeze.** At order time, write the resolved `price_per_kg` and `milling_recovery` onto
  the row so historical figures never shift when `settings` change later.
- **Migrations are append-only.** Never edit a shipped migration — add a new file per change.
- **Storefront never writes tables directly.** Anonymous order placement goes through a zod-validated
  Server Action using the server Supabase client. Only staff-authenticated sessions touch admin tables.
- **RLS is the security boundary.** Admin tables are staff-only (`profiles.role in ('owner','staff')`);
  a logged-in customer may read only their own orders.
- **The balance sheet must actually balance.** The source workbook flags "NOT balanced — check entries";
  the app must not ship that bug. Reconcile Assets = Liabilities + Owner's Equity.
- **Books posting is owner-confirmed and idempotent.** Auto-posting to `transactions` never fires on a
  trigger — the owner clicks "post" on the Journal. Revenue is recognised on **Delivered** (Sales for
  `rice_amount`, delivery fee → Other Income; unpaid balance → Accounts Receivable). Dedup via
  `related_order_id` / `related_batch_id`; a linked Sales/Purchases row blocks a second post. A/R is kept
  in sync by `reconcileOrderReceivable()` (`lib/books/posting.ts`), called on post and on `recordPayment`.
- **Locale**: `en-PH`, currency **₱ (PHP)**, timezone **Asia/Manila**. `order_no` format is `ORD-###`.
- **Order lifecycle**: `Pending → Milled → Delivered`, or `Cancelled`. Payment is manual (cash/GCash),
  unpaid balances (utang) are allowed.
- **The spreadsheets are the oracle.** When a calc result is in doubt, match the sheet's number
  (see Verification in the plan).

## Session End
- After every change, append a dated entry to `handoff.md` (newest-first).
- Update `.claude/decisions.md` for any architectural call (ADR-style: decision + why).
- Update `.claude/data-model.md` if entities/relationships change.
- New migrations only — never edit an existing one. Keep `seed.sql` in sync with schema changes.
- Keep **Current Focus** above short and dated; push detail into `handoff.md`.

> Setup blueprint: `claude_setup.md`. Grow the **Rules** section continuously — every correction
> on something non-obvious becomes a one-line rule here.
