"use client";

import { useState, useTransition } from "react";
import { recordPayment } from "@/app/actions/admin";
import { refetchCollections } from "@/lib/store/useCollection";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { peso } from "@/lib/format";
import { toast } from "@/lib/store/toast";
import type { OrderRow } from "@/lib/store/selectors";

export function PaymentDialog({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: OrderRow;
}) {
  const [pending, start] = useTransition();
  const [paid, setPaid] = useState(String(order.amount_paid ?? 0));

  function save(amount: number) {
    start(async () => {
      const r = await recordPayment(order.id, amount);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Payment recorded for ${order.order_no}`);
      refetchCollections("orders");
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Record payment · ${order.order_no}`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => save(Number(paid))} disabled={pending}>
            {pending ? "Saving…" : "Save payment"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Total due</p>
            <p className="mt-0.5 font-semibold tabular-nums">
              {peso(Number(order.total_due))}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="mt-0.5 font-semibold tabular-nums text-destructive">
              {peso(Number(order.balance))}
            </p>
          </div>
        </div>
        <Field label="Total amount paid (₱)" hint="The cumulative amount received for this order">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            autoFocus
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => {
            setPaid(String(order.total_due));
            save(Number(order.total_due));
          }}
        >
          Mark fully paid ({peso(Number(order.total_due))})
        </Button>
      </div>
    </Dialog>
  );
}
