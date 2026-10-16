import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import { OrderForm } from "./order-form";

export default async function OrderPage() {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, price_per_kg")
    .eq("slug", "nsic-rc-160")
    .maybeSingle();

  const price = Number(product?.price_per_kg ?? 60);
  const name = product?.name ?? "Freshly Milled Rice (NSIC Rc 160)";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Order rice</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {name} — {peso(price)}/kg. No account needed; we&rsquo;ll contact you to
        confirm before milling.
      </p>
      <div className="mt-6">
        <OrderForm pricePerKg={price} />
      </div>
    </main>
  );
}
