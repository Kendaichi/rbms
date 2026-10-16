import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import { Grain } from "@/components/store/grain";
import { OrderForm } from "./order-form";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ kg?: string }>;
}) {
  const { kg } = await searchParams;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, price_per_kg")
    .eq("slug", "nsic-rc-160")
    .maybeSingle();

  const price = Number(product?.price_per_kg ?? 60);
  const defaultKg = Math.max(1, Math.min(9999, Math.round(Number(kg) || 25)));

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12 lg:py-16">
      <Grain className="size-7 text-brand-gold" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Order rice</h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        NSIC Rc 160 · {peso(price)}/kg. No account needed — we&rsquo;ll contact you to
        confirm before milling.
      </p>
      <div className="mt-8">
        <OrderForm pricePerKg={price} defaultKg={defaultKg} />
      </div>
    </main>
  );
}
