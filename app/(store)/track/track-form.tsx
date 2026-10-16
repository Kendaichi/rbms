"use client";

import { useActionState } from "react";
import { trackOrder, type TrackState, type TrackedOrder } from "@/app/actions/orders";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { peso, kg as kgFmt } from "@/lib/format";

const initialState: TrackState = { searched: false };

export function TrackForm({ defaultOrderNo }: { defaultOrderNo: string }) {
  const [state, action, pending] = useActionState(trackOrder, initialState);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Order number</Label>
          <Input name="orderNo" defaultValue={defaultOrderNo} placeholder="ORD-001" />
        </div>
        <div className="space-y-1.5">
          <Label>Contact number</Label>
          <Input name="contact" inputMode="tel" placeholder="09xx xxx xxxx" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Searching…" : "Find my order"}
        </Button>
      </form>

      {state.searched && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state.order && <OrderCard order={state.order} />}
    </div>
  );
}

function OrderCard({ order }: { order: TrackedOrder }) {
  const cancelled = order.status === "Cancelled";
  const steps = ["Pending", "Milled", "Delivered"] as const;
  const currentIdx = steps.indexOf(order.status as (typeof steps)[number]);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Order</p>
          <p className="text-lg font-semibold">{order.order_no}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            cancelled
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary",
          )}
        >
          {order.status}
        </span>
      </div>

      {!cancelled && (
        <div className="mt-4 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full",
                  i <= currentIdx ? "bg-primary" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "text-[11px]",
                  i <= currentIdx ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Detail label="Customer" value={order.customer_name} />
        <Detail label="Kilograms" value={kgFmt(Number(order.kg_ordered))} />
        <Detail
          label="Fulfillment"
          value={order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}
        />
        {order.delivery_date && (
          <Detail
            label="Delivery date"
            value={`${order.delivery_date}${order.time_slot ? " · " + order.time_slot : ""}`}
          />
        )}
        {order.delivery_address && (
          <Detail label="Deliver to" value={order.delivery_address} />
        )}
        <Detail label="Total due" value={peso(Number(order.total_due))} />
        <Detail label="Paid" value={peso(Number(order.amount_paid))} />
        <Detail label="Balance" value={peso(Number(order.balance))} />
        <Detail label="Payment" value={order.payment_status} />
      </dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
