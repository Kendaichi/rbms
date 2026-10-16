"use client";

import { useState, useTransition } from "react";
import { upsertCustomer } from "@/app/actions/admin";
import { refetchCollections } from "@/lib/store/useCollection";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/ui/field";
import { toast } from "@/lib/store/toast";
import { CUSTOMER_TYPES } from "@/lib/validation/customer";
import type { CustomerRollup } from "@/lib/store/selectors";

export function CustomerForm({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: CustomerRollup | null;
}) {
  const editing = !!customer;
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(customer?.name ?? "");
  const [contact, setContact] = useState(customer?.contact_no ?? "");
  const [barangay, setBarangay] = useState(customer?.barangay ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [type, setType] = useState(customer?.customer_type ?? "Household");
  const [notes, setNotes] = useState(customer?.notes ?? "");

  function submit() {
    setErrors({});
    const values = {
      name,
      contact_no: contact,
      barangay,
      address,
      customer_type: type,
      notes,
    };
    start(async () => {
      const r = await upsertCustomer(values, customer?.id);
      if (r.fieldErrors) setErrors(r.fieldErrors);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(editing ? "Customer updated" : "Customer added");
      refetchCollections("customers");
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${customer!.name}` : "New customer"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add customer"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <Field label="Name" error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan dela Cruz" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact no." error={errors.contact_no}>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="09xx xxx xxxx" />
          </Field>
          <Field label="Type">
            <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Barangay">
            <Input value={barangay} onChange={(e) => setBarangay(e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      </form>
    </Dialog>
  );
}
