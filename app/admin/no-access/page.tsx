import { Lock } from "lucide-react";

// Landing spot for a signed-in staff user who has no pages granted yet. Reachable
// under /admin (so the proxy allows it) but outside the per-page gate, which
// avoids a redirect loop when a user has zero accessible pages.
export default function NoAccessPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        No pages assigned
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account doesn&rsquo;t have access to any pages yet. Ask the owner to
        grant you access from the Users page, then sign in again.
      </p>
    </div>
  );
}
