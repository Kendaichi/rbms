"use client";

import { useActionState } from "react";
import { changePassword, type AuthState } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: AuthState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label>New password</Label>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Confirm new password</Label>
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
