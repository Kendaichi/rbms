import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, page_access")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["owner", "staff"].includes(profile.role)) {
    redirect("/login?denied=1");
  }

  return (
    <AdminShell
      userName={profile.name ?? user.email ?? "Signed in"}
      role={profile.role as "owner" | "staff"}
      pageAccess={(profile.page_access as string[] | null) ?? []}
    >
      {children}
    </AdminShell>
  );
}
