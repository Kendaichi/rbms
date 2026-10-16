import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type Variant = VariantProps<typeof badgeVariants>["variant"];

const map: Record<string, Variant> = {
  Pending: "warning",
  Milled: "secondary",
  Delivered: "success",
  Cancelled: "danger",
  Unpaid: "danger",
  Partial: "warning",
  Paid: "success",
};

export function StatusBadge({ value, dot = true }: { value: string; dot?: boolean }) {
  return (
    <Badge variant={map[value] ?? "muted"} dot={dot}>
      {value}
    </Badge>
  );
}
