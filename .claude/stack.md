# Stack

> **Installed versions** — scaffolded 2026-10-15 via `create-next-app`. Source of truth is
> `package.json` / `package-lock.json`; this list mirrors it. (Environment shipped Next 16, not 15.)

## App (Next.js)
- **next** `16.4.1` (App Router, Server Actions; **Turbopack is the default bundler**; `cacheComponents`
  and `partialPrefetching` enabled in `next.config.ts` — note: reading cookies/auth forces dynamic
  rendering, so wrap request-time data in Suspense where needed)
- **react** / **react-dom** `19.3.0`
- **typescript** `^5`
- **tailwindcss** `^4` — wired through Turbopack via `@tailwindcss/turbopack`; **no `postcss.config`,
  no `tailwind.config.js`** — theme lives in `app/globals.css`
- **shadcn/ui** — `base-nova` style, built on **Base UI** (`@base-ui/react`); helpers `cn`,
  `tw-animate-css`, `class-variance-authority`; icon library `lucide`. Components vendored into
  `components/ui` (not versioned). NOTE: Button has no `asChild` — style a `Link` with `buttonVariants()`.
- **react-hook-form** `^7` + **@hookform/resolvers**
- **zod** `^3` — validation schemas shared between Server Actions and client forms
- **date-fns** — Asia/Manila date math for mill-by / delivery windows
- **eslint** `^9` + `eslint-config-next`

## Supabase
- **@supabase/supabase-js** `^2`
- **@supabase/ssr** `^0.6` — server/browser clients + cookie-based session for Next.js
- **supabase** CLI (dev dependency / local) — local Postgres, migrations, `gen types`

## Tooling
- **eslint** + `eslint-config-next`
- **prettier**
- **@playwright/test** — storefront guest-checkout smoke test
- **openpyxl** (Python, already installed system-wide) — read the reference `.xlsx` working papers

## Environment variables (set at scaffold)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser/server public client
- `SUPABASE_SERVICE_ROLE_KEY` — server-only (Server Actions brokering anon order writes); never exposed
- `NEXT_PUBLIC_SITE_URL` — for auth redirects / order-tracking links

## Conventions
- Package manager: **npm**. Node LTS.
- Money as integer centavos (or `numeric`) — never JS floats for money.
- Generated DB types live in `lib/types/database.ts` (`supabase gen types typescript`).
