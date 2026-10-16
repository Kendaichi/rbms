"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { updateTransaction, deleteTransaction } from "@/app/actions/books";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/ui/field";
import { toast } from "@/lib/store/toast";

type Account = { id: string; title: string; category: string };
export type JournalTxn = {
  id: string;
  txn_date: string;
  txn_no: string | null;
  particulars: string | null;
  amount: number;
  ref: string | null;
  account_id: string;
  isAuto: boolean;
};

function EditDialog({
  txn,
  accounts,
  onClose,
}: {
  txn: JournalTxn;
  accounts: Account[];
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [date, setDate] = useState(txn.txn_date);
  const [accountId, setAccountId] = useState(txn.account_id);
  const [particulars, setParticulars] = useState(txn.particulars ?? "");
  const [amount, setAmount] = useState(String(txn.amount));
  const [txnNo, setTxnNo] = useState(txn.txn_no ?? "");
  const [ref, setRef] = useState(txn.ref ?? "");

  const groups = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  function submit() {
    setErrors({});
    start(async () => {
      const r = await updateTransaction(txn.id, {
        txn_date: date,
        account_id: accountId,
        particulars,
        amount,
        txn_no: txnNo,
        ref,
      });
      if (r.fieldErrors) setErrors(r.fieldErrors);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Entry updated");
      onClose();
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit journal entry"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" error={errors.txn_date}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Ref / No.">
            <Input value={txnNo} onChange={(e) => setTxnNo(e.target.value)} />
          </Field>
        </div>
        <Field label="Account" error={errors.account_id}>
          <select
            className={selectClass}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {Object.entries(groups).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Particulars" error={errors.particulars}>
          <Input value={particulars} onChange={(e) => setParticulars(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₱)" error={errors.amount}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Reference doc">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}

export function TransactionRowActions({
  txn,
  accounts,
}: {
  txn: JournalTxn;
  accounts: Account[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <DropdownMenu>
        {!txn.isAuto && (
          <MenuItem icon={Pencil} onSelect={() => setEditing(true)}>
            Edit
          </MenuItem>
        )}
        <MenuItem icon={Trash2} variant="destructive" onSelect={() => setDeleting(true)}>
          Delete
        </MenuItem>
      </DropdownMenu>
      {editing && (
        <EditDialog txn={txn} accounts={accounts} onClose={() => setEditing(false)} />
      )}
      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(false)}
          title="Delete journal entry?"
          destructive
          confirmLabel="Delete entry"
          body={
            txn.isAuto
              ? "This is an auto-posted entry. Deleting it un-posts the linked sale/purchase and re-syncs Accounts Receivable and the balance sheet."
              : "This permanently removes the journal entry."
          }
          onConfirm={async () => {
            const r = await deleteTransaction(txn.id);
            if (r.error) toast.error(r.error);
            else toast.success("Entry deleted");
          }}
        />
      )}
    </>
  );
}
