"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizePages } from "@/lib/admin/pages";

export type ActionResult = { ok?: boolean; error?: string };

const ROLES = ["owner", "staff"] as const;
type Role = (typeof ROLES)[number];

const SERVICE_HINT =
  "User creation isn't configured. Add SUPABASE_SERVICE_ROLE_KEY to the app environment.";

// Confirm the caller is a signed-in owner. Returns the owner's user id or an
// error — every mutation here is owner-only (RLS also enforces it on profiles).
async function requireOwnerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are not signed in." as string };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "owner") {
    return { error: "Only an owner can manage users." as string };
  }
  return { supabase, userId: user.id };
}

function normalizePages(role: Role, pages: string[] | undefined): string[] {
  // Owners implicitly have every page, so we store no grants for them.
  return role === "owner" ? [] : sanitizePages(pages ?? []);
}

// Create a new back-office user (owner-only). Needs the service role because the
// anon/user client cannot provision auth users for other people.
export async function addUser(input: {
  email: string;
  password: string;
  name?: string;
  role: string;
  pages?: string[];
}): Promise<ActionResult> {
  const guard = await requireOwnerUser();
  if ("error" in guard) return { error: guard.error };

  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (input.password.length < 8) {
    return { error: "Temporary password must be at least 8 characters." };
  }
  if (!ROLES.includes(input.role as Role)) return { error: "Invalid role." };
  const role = input.role as Role;
  const pages = normalizePages(role, input.pages);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: SERVICE_HINT };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });
  if (error) {
    const msg = /already been registered|already exists/i.test(error.message)
      ? "A user with that email already exists."
      : error.message;
    return { error: msg };
  }

  // The handle_new_user trigger inserts a default profile; upsert the intended
  // role/name/pages over it (idempotent whether or not the trigger has run).
  const { error: pErr } = await admin.from("profiles").upsert(
    { id: data.user.id, name, role, page_access: pages, must_change_password: true },
    { onConflict: "id" },
  );
  if (pErr) return { error: pErr.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

// Update a user's role and page grants (owner-only). Runs as the owner so the
// profiles_owner_all RLS policy authorizes the write.
export async function updateUserAccess(
  userId: string,
  input: { role: string; pages?: string[] },
): Promise<ActionResult> {
  const guard = await requireOwnerUser();
  if ("error" in guard) return { error: guard.error };
  const { supabase } = guard;

  if (!ROLES.includes(input.role as Role)) return { error: "Invalid role." };
  const role = input.role as Role;
  const pages = normalizePages(role, input.pages);

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "That user no longer exists." };

  // Never leave the business without an owner.
  if (target.role === "owner" && role !== "owner") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return { error: "You can't demote the last owner. Promote someone else first." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, page_access: pages })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

// Remove a user entirely (owner-only). Deleting the auth user cascades the
// profile row (profiles.id references auth.users on delete cascade).
export async function deleteUser(userId: string): Promise<ActionResult> {
  const guard = await requireOwnerUser();
  if ("error" in guard) return { error: guard.error };
  const { supabase, userId: meId } = guard;

  if (userId === meId) return { error: "You can't delete your own account." };

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "That user no longer exists." };
  if (target.role === "owner") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return { error: "You can't delete the last owner." };
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: SERVICE_HINT };
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
