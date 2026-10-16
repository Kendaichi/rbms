"use client";

import { useState, useTransition } from "react";
import { createOrder, updateOrder } from "@/app/actions/admin";
import { refetchCollections } from "@/lib/store/useCollection";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/ui/field";
import { peso } from "@/lib/format";
import { toast } from "@/lib/store/toast";
import { cn } from "@/lib/utils";
import type { OrderRow, CustomerRow } from "@/lib/store/selectors";

const TIME_SLOTS = ["Morning (8-12)", "Afternoon (1-5)"];

export function OrderForm({
  open,
  onClose,
  customers,
  defaultPrice,
  order,
}: {
  open: boolean;
  onClose: () => void;
  customers: CustomerRow[];
  defaultPrice: number;
  order?: OrderRow | null;
}) {
  const editing = !!order;
  const locked = editing && order!.status !== "Pending";

  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    editing || customers.length > 0 ? "existing" : "new",
  );
  const [customerId, setCustomerId] = useState(
    order?.customer_id ?? customers[0]?.id ?? "",
  );
  const [cName, setCName] = useState("");
  const [cContact, setCContact] = useState("");
  const [cBarangay, setCBarangay] = useState("");
  const [cAddress, setCAddress] = useState("");

  const [kg, setKg] = useState(order ? String(order.kg_ordered) : "");
  const [price, setPrice] = useState(
    order ? String(order.price_per_kg) : String(defaultPrice),
  );
  const [fulfillment, setFulfillment] = useState(
    order?.fulfillment_type ?? "delivery",
  );
  const [deliveryDate, setDeliveryDate] = useState(order?.delivery_date ?? "");
  const [timeSlot, setTimeSlot] = useState(order?.time_slot ?? TIME_SLOTS[0]);
  const [address, setAddress] = useState(order?.delivery_address ?? "");
  const [fee, setFee] = useState(order ? String(order.delivery_fee) : "0");
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes] = useState(order?.notes ?? "");

  const kgNum = Number(kg) || 0;
  const priceNum = Number(price) || 0;
  const feeNum = Number(fee) || 0;
  const total = kgNum * priceNum + feeNum;
  const isDelivery = fulfillment === "delivery";

  function submit() {
    setErrors({});
    const values = {
      customer_id: customerMode === "existing" ? customerId : "",
      customer_name: customerMode === "new" ? cName : "",
      customer_contact: customerMode === "new" ? cContact : "",
      customer_barangay: customerMode === "new" ? cBarangay : "",
      customer_address: customerMode === "new" ? cAddress : "",
      kg_ordered: kg,
      price_per_kg: price,
      fulfillment_type: fulfillment,
      delivery_date: deliveryDate,
      time_slot: timeSlot,
      delivery_address: address,
      delivery_fee: fee,
      amount_paid: editing ? "0" : amountPaid,
      notes,
    };
    start(async () => {
      const r = editing
        ? await updateOrder(order!.id, values)
        : await createOrder(values);
      if (r.fieldErrors) setErrors(r.fieldErrors);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        editing ? `Order ${order!.order_no} updated` : `Order ${r.orderNo} created`,
      );
      refetchCollections("orders", "customers");
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${order!.order_no}` : "New order"}
      description={
        editing
          ? locked
            ? "This order is past Pending — delivery details only; financials are frozen."
            : "Update order details."
          : "Record a walk-in or phoned-in order."
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create order"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        {/* Customer */}
        {locked ? (
          <p className="text-sm text-muted-foreground">
            Customer and amounts are locked.{" "}
            <span className="font-medium text-foreground">
              {kgNum} kg × {peso(priceNum)} = {peso(total)}
            </span>
          </p>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center gap-1.5">
              {(["existing", "new"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCustomerMode(m)}
                  disabled={m === "existing" && customers.length === 0}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
                    customerMode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "existing" ? "Existing customer" : "New customer"}
                </button>
              ))}
            </div>

            {customerMode === "existing" ? (
              <Field label="Customer" error={errors.customer_name}>
                <select
                  className={selectClass}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  {customers.length === 0 && <option value="">No customers yet</option>}
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.contact_no ? ` · ${c.contact_no}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name" error={errors.customer_name}>
                  <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Juan dela Cruz" />
                </Field>
                <Field label="Contact no.">
                  <Input value={cContact} onChange={(e) => setCContact(e.target.value)} placeholder="09xx xxx xxxx" />
                </Field>
                <Field label="Barangay">
                  <Input value={cBarangay} onChange={(e) => setCBarangay(e.target.value)} />
                </Field>
                <Field label="Address">
                  <Input value={cAddress} onChange={(e) => setCAddress(e.target.value)} />
                </Field>
              </div>
            )}
          </section>
        )}

        {/* Order amounts */}
        <section className="grid grid-cols-2 gap-3">
          <Field label="Kilograms" error={errors.kg_ordered}>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder="50"
              disabled={locked}
            />
          </Field>
          <Field label="Price / kg (₱)" error={errors.price_per_kg}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={locked}
            />
          </Field>
        </section>

        {/* Fulfillment */}
        <section className="space-y-3">
          <Field label="Fulfillment">
            <select
              className={selectClass}
              value={fulfillment}
              onChange={(e) => setFulfillment(e.target.value)}
            >
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </select>
          </Field>
          {isDelivery && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Delivery date" error={errors.delivery_date}>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </Field>
              <Field label="Time slot">
                <select
                  className={selectClass}
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delivery address" error={errors.delivery_address} className="sm:col-span-2">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery fee (₱)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                disabled={locked}
              />
            </Field>
            {!editing && (
              <Field label="Amount paid now (₱)" hint="Leave 0 for utang">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </Field>
            )}
          </div>
        </section>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">Total due</span>
          <span className="text-base font-semibold tabular-nums">{peso(total)}</span>
        </div>
      </form>
    </Dialog>
  );
}
