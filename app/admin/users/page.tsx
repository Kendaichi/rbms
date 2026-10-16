import { requireOwner } from "@/lib/supabase/roles";
import { createClient } from "@/lib/supabase/server";
import { UsersTable, type UserRow } from "./users-table";

export default async function UsersPage() {
  const me = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, role, page_access, created_at")
    .order("created_at", { ascending: true });

  const users: UserRow[] = (data ?? []).map((u) => ({
    id: u.id as string,
    name: (u.name as string | null) ?? "",
    role: u.role as UserRow["role"],
    pages: (u.page_access as string[] | null) ?? [],
    created_at: u.created_at as string,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Add back-office users and control which pages each one can open. Owners
          can open everything (including this page); staff see only the pages you
          grant them.
        </p>
      </div>

      <UsersTable users={users} currentUserId={me.id} />

      <p className="max-w-2xl text-xs text-muted-foreground">
        Use <strong>Add user</strong> to create an account with a temporary
        password — share it with them to sign in and change. Creating users needs
        the service-role key configured in the app environment.
      </p>
    </div>
  );
}
