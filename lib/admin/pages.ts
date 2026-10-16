// Shared admin page registry — the single source of truth for page keys, labels
// and access rules. Imported by the proxy (path gating), the nav (visibility),
// the server route guards and the Users UI, so they can never drift apart. Keep
// this module dependency-free (no server/client-only imports) so every runtime
// — edge proxy, server components, client components — can import it.

export type PageKey =
  | "dashboard"
  | "orders"
  | "customers"
  | "deliveries"
  | "inventory"
  | "costing"
  | "books"
  | "settings"
  | "users"
  | "audit";

// Grantable pages, in nav order. An owner can grant any subset of these to a
// staff user.
export const GRANTABLE_PAGES: { key: PageKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "deliveries", label: "Deliveries" },
  { key: "inventory", label: "Inventory" },
  { key: "costing", label: "Costing" },
  { key: "books", label: "Books" },
  { key: "settings", label: "Settings" },
];

// Owner-only pages — never grantable. Granting user management would let a staff
// member grant themselves anything, defeating page access entirely.
export const OWNER_ONLY_PAGES: PageKey[] = ["users", "audit"];

const GRANTABLE_KEYS: string[] = GRANTABLE_PAGES.map((p) => p.key);

export function isGrantable(page: string): page is PageKey {
  return GRANTABLE_KEYS.includes(page);
}

// Keep only valid, grantable page keys (drops owner-only + unknown values).
export function sanitizePages(pages: readonly string[]): PageKey[] {
  return GRANTABLE_PAGES.map((p) => p.key).filter((k) => pages.includes(k));
}

// Map an /admin/... pathname to its page key. `/admin` (index) and unknown
// segments resolve to "dashboard".
export function pageFromPath(pathname: string): PageKey {
  const seg = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  if (!seg) return "dashboard";
  const all = [...GRANTABLE_KEYS, ...OWNER_ONLY_PAGES];
  return (all.includes(seg) ? seg : "dashboard") as PageKey;
}

// Can a user with this role + grants open this page? Owners can open everything.
export function canAccessPage(
  role: string,
  pageAccess: readonly string[],
  page: PageKey,
): boolean {
  if (role === "owner") return true;
  if (OWNER_ONLY_PAGES.includes(page)) return false;
  return pageAccess.includes(page);
}

// The first grantable page a staff user can open — used as their landing page.
export function firstAccessiblePage(
  pageAccess: readonly string[],
): PageKey | null {
  return GRANTABLE_PAGES.find((p) => pageAccess.includes(p.key))?.key ?? null;
}
