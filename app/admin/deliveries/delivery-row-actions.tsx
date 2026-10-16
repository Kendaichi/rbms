"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Wheat, Truck, ExternalLink } from "lucide-react";
import { updateOrderStatus } from "@/app/actions/admin";
import { refetchCollections } from "@/lib/store/useCollection";
import { Button } from "@/components/ui/button";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/store/toast";
import type { OrderRow } from "@/lib/store/selectors";

export function DeliveryRowActions({ order }: { order: OrderRow }) {
  const [pending, start] = useTransition();
  const setStatus = (status: string, verb: string) =>
    start(async () => {
      const r = await updateOrderStatus(order.id, status);
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success(`${order.order_no} ${verb}`);
        refetchCollections("orders");
      }
    });

  return (
    <div className="flex items-center justify-end gap-1">
      {order.status === "Pending" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("Milled", "marked milled")}>
          <Wheat className="size-3.5" />
          Mill
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("Delivered", "marked delivered")}>
          <Truck className="size-3.5" />
          Deliver
        </Button>
      )}
      <DropdownMenu>
        {order.status === "Pending" && (
          <MenuItem icon={Wheat} onSelect={() => setStatus("Milled", "marked milled")}>
            Mark milled
          </MenuItem>
        )}
        <MenuItem icon={Truck} onSelect={() => setStatus("Delivered", "marked delivered")}>
          Mark delivered
        </MenuItem>
      </DropdownMenu>
      <Link
        href={`/admin/orders/${order.id}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Open order"
      >
        <ExternalLink className="size-4" />
      </Link>
    </div>
  );
}
