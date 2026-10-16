import { getCurrentProfile } from "@/lib/supabase/roles";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const forced = profile.mustChangePassword;

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {forced ? "Set your password" : "Change password"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {forced
            ? "Your account was created with a temporary password. Choose a new one to continue."
            : "Choose a new password for your account."}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
