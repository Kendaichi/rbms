import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import { Grain } from "@/components/store/grain";
import { CONTACT } from "@/lib/contact";
import { OrderForm } from "./order-form";

export const metadata: Metadata = {
  title: "Order NSIC Rc 160 Jasmine Rice",
  description:
    "Order freshly milled NSIC Rc 160 jasmine rice by the kilo. Milled on an order basis — pay on delivery, pickup, or utang.",
  alternates: { canonical: "/order" },
};

const POINTS = [
  "Aromatic NSIC Rc 160 — a fragrant jasmine variety, one type done well",
  "By the kilo — order 10, 25, 50 or more, no strict minimum",
  "Delivered to your barangay, or pick it up",
  "Pay on delivery, pickup, or run a balance (utang)",
];

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
    <main className="flex-1">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-start lg:py-16">
        {/* Advertisement — what you're ordering and why */}
        <div>
          <Grain className="size-7 text-brand-gold" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-brand-gold">
            NSIC Rc 160 Jasmine Rice
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Fragrant jasmine rice, milled the day it reaches you.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground text-pretty">
            Aromatic NSIC Rc 160 at <span className="font-semibold text-foreground">{peso(price)}/kg</span>,
            ordered by the kilo. No account needed.
          </p>

          {/* Order-basis callout */}
          <div className="mt-6 rounded-2xl bg-secondary p-5 text-secondary-foreground">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Grain className="size-4 shrink-0 text-brand-gold" />
              Milled on an order basis
            </h2>
            <p className="mt-1.5 text-sm text-secondary-foreground/80 text-pretty">
              We don&rsquo;t keep bagged stock sitting in a warehouse. Every order is milled
              fresh once you place it, so your rice arrives fragrant and new. We&rsquo;ll
              contact you to confirm before milling.
            </p>
          </div>

          <ul className="mt-6 space-y-3 text-sm">
            {POINTS.map((t) => (
              <li key={t} className="flex items-start gap-3 text-pretty">
                <Grain className="mt-0.5 size-4 shrink-0 text-brand-gold" />
                {t}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-muted-foreground text-pretty">
            Buying in bulk or reselling?{" "}
            <a
              href={CONTACT.phoneHref}
              className="font-medium text-foreground underline underline-offset-4 hover:text-brand-gold"
            >
              Call or text {CONTACT.phoneDisplay}
            </a>{" "}
            for reseller pricing.
          </p>
        </div>

        {/* Order form */}
        <div className="w-full lg:w-[420px] lg:justify-self-end">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-7">
            <OrderForm pricePerKg={price} defaultKg={defaultKg} />
          </div>
        </div>
      </div>
    </main>
  );
}
