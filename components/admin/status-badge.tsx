import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  Pending: "bg-brand-gold/15 text-brand-gold",
  Milled: "bg-secondary text-secondary-foreground",
  Delivered: "bg-primary/10 text-primary",
  Cancelled: "bg-destructive/10 text-destructive",
  Unpaid: "bg-destructive/10 text-destructive",
  Partial: "bg-brand-gold/15 text-brand-gold",
  Paid: "bg-primary/10 text-primary",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        styles[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}
