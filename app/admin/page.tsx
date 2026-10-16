import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/roles";
import { firstAccessiblePage } from "@/lib/admin/pages";

export default async function AdminIndex() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "owner") redirect("/admin/dashboard");
  const first = firstAccessiblePage(profile.pageAccess);
  redirect(first ? `/admin/${first}` : "/admin/no-access");
}
