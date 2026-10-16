// Server-only: createClient pulls next/headers, so importing this from a client
// component is a build error (which is what we want — it guards admin routes).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessPage, type PageKey } from "@/lib/admin/pages";

export type AppRole = "owner" | "staff";

export type CurrentProfile = {
  id: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  pageAccess: string[];
  mustChangePassword: boolean;
};

// Read the signed-in user's profile (id + role + name + page grants). Returns
// null when there is no session or no profile row. Safe under RLS:
// profiles_self_read lets a user read their own row regardless of role.
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("name, role, page_access, must_change_password")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    name: (data.name as string | null) ?? null,
    role: data.role as AppRole,
    pageAccess: (data.page_access as string[] | null) ?? [],
    mustChangePassword: (data.must_change_password as boolean | null) ?? false,
  };
}

// Owner-only route guard — for pages that are never grantable (Users). Signed-out
// users go to login; signed-in non-owners are bounced to their own landing page.
export async function requireOwner(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "owner") redirect("/admin");
  return profile;
}

// Per-page route guard — for grantable server pages (books, settings, costing).
// Owners always pass; staff pass only if the page is in their grants. The proxy
// enforces this too; this is defense in depth at the component level.
export async function requirePage(page: PageKey): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canAccessPage(profile.role, profile.pageAccess, page)) redirect("/admin");
  return profile;
}
