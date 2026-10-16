"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus, recordPayment } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { peso } from "@/lib/format";

export function OrderActions({
  id,
  status,
  amountPaid,
  totalDue,
}: {
  id: string;
  status: string;
  amountPaid: number;
  totalDue: number;
}) {
  const [pending, start] = useTransition();
  const [paid, setPaid] = useState(String(amountPaid));
  const [msg, setMsg] = useState<string | null>(null);

  const cancelled = status === "Cancelled";

  function run(fn: () => Promise<{ error?: string }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r?.error) setMsg(r.error);
    });
  }

  return (
    <div className="space-y-6 rounded-xl border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold">Update status</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || cancelled || status === "Milled" || status === "Delivered"}
            onClick={() => run(() => updateOrderStatus(id, "Milled"))}
          >
            Mark milled
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || cancelled || status === "Delivered"}
            onClick={() => run(() => updateOrderStatus(id, "Delivered"))}
          >
            Mark delivered
          </Button>
          {status !== "Pending" && !cancelled && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => updateOrderStatus(id, "Pending"))}
            >
              Back to pending
            </Button>
          )}
          {cancelled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => updateOrderStatus(id, "Pending"))}
            >
              Reopen order
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => updateOrderStatus(id, "Cancelled"))}
            >
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Record payment</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Total due {peso(totalDue)}. Enter the total amount paid so far.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>Amount paid (₱)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => recordPayment(id, Number(paid)))}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setPaid(String(totalDue));
              run(() => recordPayment(id, totalDue));
            }}
          >
            Mark fully paid
          </Button>
        </div>
      </div>

      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
