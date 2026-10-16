"use client";

import { useActionState } from "react";
import { setEndingInventory, type FormState } from "@/app/actions/books";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initial: FormState = {};

export function EndingInventoryForm({
  month,
  current,
}: {
  month: string;
  current: number;
}) {
  const [state, action, pending] = useActionState(setEndingInventory, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="month" value={month} />
      <div className="space-y-1.5">
        <Label>Ending inventory @ cost (₱)</Label>
        <Input
          type="number"
          name="ending_inventory_at_cost"
          min={0}
          step="0.01"
          defaultValue={current}
          className="w-44"
        />
        {e.ending_inventory_at_cost && (
          <p className="text-xs text-destructive">
            {e.ending_inventory_at_cost}
          </p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.ok && <span className="text-sm text-primary">Saved.</span>}
      {state.error && (
        <span className="text-sm text-destructive">{state.error}</span>
      )}
    </form>
  );
}
