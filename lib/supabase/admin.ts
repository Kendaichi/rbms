import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client — BYPASSES RLS. Server-only, used solely for
// owner-driven user provisioning (creating/removing auth users), which the
// anon/user client cannot do. Never import this into client code, and never use
// it for request-time data reads where RLS should apply.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in the environment (Supabase dashboard →
// Project Settings → API). Throws if it is missing so callers can surface a
// clear "not configured" message instead of failing silently.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SERVICE_ROLE_NOT_CONFIGURED");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
