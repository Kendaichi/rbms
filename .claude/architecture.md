# Architecture

## Topology
```
                         Browsers
          ┌───────────────────────────┬───────────────────────────┐
          │  Customer (public)        │  Owner / staff (private)   │
          ▼                           ▼                            │
   ┌──────────────────────────────────────────────────────────┐   │
   │                 Next.js 15 app (Vercel)                   │   │
   │                                                           │   │
   │   app/(store)/ ...... storefront  │  app/admin/ ... office │   │
   │        landing, order, track,     │   dashboard, orders,   │   │
   │        optional account           │   customers, deliveries│   │
   │                                   │   inventory, costing,  │   │
   │                                   │   books, settings      │   │
   │                                                           │   │
   │   app/actions/ ......... Server Actions (zod-validated)   │   │
   │   lib/supabase/ ........ server.ts / client.ts / mw.ts    │   │
   │   lib/calc/ ............ costing · orders · accounting     │   │
   └───────────────┬───────────────────────────┬──────────────┘   │
                   │ server Supabase client     │ browser client    │
                   │ (Server Actions / RSC)     │ (interactive)     │
                   ▼                            ▼                    │
   ┌──────────────────────────────────────────────────────────┐   │
   │                     Supabase (Cloud)                      │◀──┘ Auth session
   │  Postgres  ·  Auth (email/pw)  ·  RLS  ·  Storage         │
   │                                                           │
   │  tables: settings, products, customers, orders,           │
   │          palay_batches, milling_runs, accounts,           │
   │          transactions, ppe_items, monthly_inventory,      │
   │          profiles                                         │
   │  views:  order totals, customer rollups, dashboard,       │
   │          income statement / COGS / balance sheet / summary│
   └──────────────────────────────────────────────────────────┘
```

## Data flow: Costing → Orders → Books (the integration the sheets already have)
- **Costing**: a `palay_batch` (palay kg, price, drying/milling/packaging/transport, method) →
  `lib/calc/costing.ts` computes rice kg (via recovery), cost-per-kg, break-even, pay-a-mill vs
  own-miller, miller ROI.
- **Orders**: a `palay_batch` feeds palay-on-hand; orders consume rice. Each order resolves
  `price_per_kg`/`milling_recovery` at write time → `rice_amount`, `total_due`, `balance`,
  `palay_to_mill`, `mill_by = delivery_date − mill_days_before_delivery`.
- **Books**: orders and batches optionally **auto-post** journal `transactions` (owner-confirmed, never
  silent): order Paid → `Sales`; delivered-unpaid → `Accounts Receivable - Unpaid Sale`; collected →
  `Accounts Receivable - Collected`; batch → `Purchases of Palay` + processing lines. Depreciation is
  generated from `ppe_items` (straight-line), not typed as a transaction.

## Notes
- **Two surfaces, one app.** Route groups split public `(store)` from private `admin`; the admin
  `layout.tsx` is the auth guard. The storefront is readable by anyone; writes only via Server Actions.
- **Anon writes are brokered.** The order-placement Server Action runs with the server client, upserts
  the customer by contact, inserts the order, returns `order_no`. Anonymous roles never get table-level
  write policies.
- **Derived vs. stored.** Totals, rollups, and financial statements are SQL views / `lib/calc` pure
  functions. Only resolve-and-freeze values (`price_per_kg`, `milling_recovery` on the order) are stored.
- **Statements are computed, not tabled.** Income Statement / COGS / Balance Sheet / Year Summary are
  derived from `transactions` + `ppe_items` + `monthly_inventory` per month.
