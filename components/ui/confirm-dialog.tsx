"use client";

import { useTransition } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";

// Shared confirmation for destructive/irreversible actions across the admin.
// onConfirm runs the action; the dialog closes afterward (the caller surfaces
// success/failure via a toast).
export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                await onConfirm();
                onClose();
              })
            }
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-muted-foreground">{body}</div>
    </Dialog>
  );
}
