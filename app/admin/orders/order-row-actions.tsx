"use client";

import { useTransition } from "react";
import {
  Wheat,
  Truck,
  Banknote,
  Pencil,
  Ban,
  RotateCcw,
  Undo2,
  Trash2,
} from "lucide-react";
import { updateOrderStatus } from "@/app/actions/admin";
import { refetchCollections } from "@/lib/store/useCollection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  MenuItem,
  MenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/store/toast";
import type { OrderRow } from "@/lib/store/selectors";

export function OrderRowActions({
  order,
  onEdit,
  onPay,
  onDelete,
}: {
  order: OrderRow;
  onEdit: (o: OrderRow) => void;
  onPay: (o: OrderRow) => void;
  onDelete: (o: OrderRow) => void;
}) {
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

  const cancelled = order.status === "Cancelled";
  const delivered = order.status === "Delivered";
  const hasBalance = Number(order.balance) > 0;

  return (
    <div className="flex items-center justify-end gap-1">
      {!cancelled && order.status === "Pending" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setStatus("Milled", "marked milled")}
        >
          <Wheat className="size-3.5" />
          Mill
        </Button>
      )}
      {!cancelled && order.status === "Milled" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setStatus("Delivered", "marked delivered")}
        >
          <Truck className="size-3.5" />
          Deliver
        </Button>
      )}

      <DropdownMenu>
        {!cancelled && order.status === "Pending" && (
          <MenuItem icon={Wheat} onSelect={() => setStatus("Milled", "marked milled")}>
            Mark milled
          </MenuItem>
        )}
        {!cancelled && !delivered && (
          <MenuItem icon={Truck} onSelect={() => setStatus("Delivered", "marked delivered")}>
            Mark delivered
          </MenuItem>
        )}
        {!cancelled && delivered && (
          <MenuItem icon={Undo2} onSelect={() => setStatus("Milled", "moved back to milled")}>
            Undo delivery
          </MenuItem>
        )}
        {!cancelled && order.status === "Milled" && (
          <MenuItem icon={Undo2} onSelect={() => setStatus("Pending", "moved back to pending")}>
            Undo milling
          </MenuItem>
        )}
        {!cancelled && hasBalance && (
          <MenuItem icon={Banknote} onSelect={() => onPay(order)}>
            Record payment
          </MenuItem>
        )}
        <MenuItem icon={Pencil} onSelect={() => onEdit(order)}>
          Edit order
        </MenuItem>
        <MenuSeparator />
        {cancelled ? (
          <MenuItem icon={RotateCcw} onSelect={() => setStatus("Pending", "reopened")}>
            Reopen order
          </MenuItem>
        ) : (
          <MenuItem icon={Ban} onSelect={() => setStatus("Cancelled", "cancelled")}>
            Cancel order
          </MenuItem>
        )}
        <MenuItem icon={Trash2} variant="destructive" onSelect={() => onDelete(order)}>
          Delete
        </MenuItem>
      </DropdownMenu>
    </div>
  );
}
