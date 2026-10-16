// Date helpers. The business runs in Asia/Manila; "today" must be computed in
// that timezone (not the server/browser locale) so deliveries/mill-by line up.

export function manilaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// First day (YYYY-MM-01) of the month that contains `iso`.
export function startOfMonth(iso: string): string {
  return iso.slice(0, 7) + "-01";
}

// Human month label, e.g. "Oct 2026", from a YYYY-MM or YYYY-MM-DD string.
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
}
