import { requirePage } from "@/lib/supabase/roles";
import { BooksNav } from "./books-nav";

export default async function BooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePage("books");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Books of account
        </h1>
        <p className="text-sm text-muted-foreground">
          Journal, income statement, balance sheet, depreciation and the yearly
          roll-up — the business&rsquo;s books, live from orders and costs.
        </p>
      </div>
      <BooksNav />
      {children}
    </div>
  );
}
