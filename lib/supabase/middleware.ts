import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  pageFromPath,
  canAccessPage,
  firstAccessiblePage,
} from "@/lib/admin/pages";

// Refreshes the Supabase auth session on every matched request, keeps the session
// cookies in sync, and gates /admin/* by the signed-in user's role + page grants.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser() —
  // it refreshes the token and must not be interrupted.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Build a redirect that carries the refreshed auth cookies along.
    const redirectTo = (path: string) => {
      const url = request.nextUrl.clone();
      url.pathname = path;
      url.search = "";
      const res = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
      return res;
    };

    if (!user) return redirectTo("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, page_access, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role as string | undefined;
    if (role !== "owner" && role !== "staff") {
      return redirectTo("/login");
    }

    // Force a first-login password change before anything else in /admin.
    const isChangePw = pathname.startsWith("/admin/change-password");
    if (profile?.must_change_password === true && !isChangePw) {
      return redirectTo("/admin/change-password");
    }

    // The index, no-access and change-password routes are always reachable (the
    // index redirects onward; the others avoid gating loops).
    const isIndex = pathname === "/admin" || pathname === "/admin/";
    const isNoAccess = pathname.startsWith("/admin/no-access");
    if (role !== "owner" && !isIndex && !isNoAccess && !isChangePw) {
      const pages = (profile?.page_access as string[] | null) ?? [];
      const page = pageFromPath(pathname);
      if (!canAccessPage(role, pages, page)) {
        const first = firstAccessiblePage(pages);
        return redirectTo(first ? `/admin/${first}` : "/admin/no-access");
      }
    }
  }

  return supabaseResponse;
}
