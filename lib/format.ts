export function peso(n: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function kg(n: number): string {
  return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 3 }).format(
    Number.isFinite(n) ? n : 0,
  )} kg`;
}
