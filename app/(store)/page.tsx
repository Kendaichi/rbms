import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Grain, GrainBurst } from "@/components/store/grain";
import { PriceCalculator } from "@/components/store/price-calculator";
import { CONTACT } from "@/lib/contact";
import { cn } from "@/lib/utils";

const STEPS = [
  { t: "Order by the kilo", d: "Tell us how many kilos you need — 10, 25, 50 or more. No account, no minimum fuss." },
  { t: "Milled fresh", d: "We mill your NSIC Rc 160 palay the day it goes out, so it reaches you fragrant and new." },
  { t: "Delivered or pickup", d: "Choose a date and time slot for delivery to your barangay, or pick it up. Pay on receipt." },
];

const FAQS = [
  { q: "How do I pay?", a: "Cash or GCash on delivery or pickup. Regular customers can run a balance (utang) — we'll keep track." },
  { q: "How fresh is the rice?", a: "We mill to order. Your rice is milled right before it's delivered, not pulled from months-old stock." },
  { q: "Is there a minimum order?", a: "No strict minimum — order what your household or store needs, by the kilo." },
  { q: "Where do you deliver?", a: "Around the barangay and nearby areas. Choose delivery at checkout and we'll confirm the schedule with you." },
];

export default async function StoreHome() {
  const supabase = await createClient();
  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase.from("products").select("name, price_per_kg").eq("slug", "nsic-rc-160").maybeSingle(),
    supabase.from("settings").select("default_price_per_kg").eq("id", true).maybeSingle(),
  ]);
  const price = Number(product?.price_per_kg ?? settings?.default_price_per_kg ?? 60);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <GrainBurst className="pointer-events-none absolute -top-24 -right-20 size-[460px] text-brand-gold/20 sm:size-[560px]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h1 className="text-4xl font-semibold leading-[1.04] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Milled fresh. Delivered to your barangay.
            </h1>
            <p className="mt-5 max-w-md text-lg text-primary-foreground/80 text-pretty">
              NSIC Rc 160 rice, milled the day we bring it to you. Order any number of
              kilos — pay on delivery, pickup, or utang.
            </p>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/85">
              {["Freshly milled", "By the kilo", "Pay on delivery"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Grain className="size-3.5 rotate-12 text-brand-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full lg:w-[380px] lg:justify-self-end">
            <PriceCalculator pricePerKg={price} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
        <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          From palay to your door in three steps.
        </h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.t}>
              <Grain className="size-7 text-brand-gold" />
              <h3 className="mt-4 text-xl font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-muted-foreground text-pretty">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="order-last flex justify-center lg:order-first">
            <GrainBurst className="size-56 text-primary sm:size-72" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Rice that hasn&rsquo;t sat in a warehouse.
            </h2>
            <p className="mt-4 text-lg text-pretty">
              We mill NSIC Rc 160 palay to order, so your rice is fragrant and fresh —
              not stock that&rsquo;s been bagged for months. One variety, done well, at a
              fair price per kilo.
            </p>
          </div>
        </div>
      </section>

      {/* Bulk & resellers */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Supplying resellers &amp; bulk buyers.
            </h2>
            <p className="mt-4 max-w-md text-lg text-muted-foreground text-pretty">
              Run a sari-sari store, canteen, or resell by the sack? We supply freshly
              milled NSIC Rc 160 at reseller pricing, on a schedule that fits you.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Reseller & bulk pricing by volume",
                "Scheduled, reliable delivery",
                "Milled to order — always fresh",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-pretty">
                  <Grain className="size-4 shrink-0 text-brand-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-secondary p-6 text-secondary-foreground sm:p-8">
            <h3 className="text-lg font-semibold tracking-tight">Get a reseller quote</h3>
            <p className="mt-1 text-sm text-secondary-foreground/80">
              Tell us your volume and area — we&rsquo;ll price it fast.
            </p>
            <a
              href={CONTACT.phoneHref}
              className="mt-4 flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-card/80"
            >
              <Phone className="size-5 shrink-0 text-primary" />
              <span>
                <span className="block text-xs text-muted-foreground">Call or text</span>
                <span className="block text-lg font-semibold tabular-nums">
                  {CONTACT.phoneDisplay}
                </span>
              </span>
            </a>
            <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}>
              Contact us
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good to know</h2>
        <div className="mt-8 space-y-7">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="text-lg font-semibold tracking-tight">{f.q}</h3>
              <p className="mt-1.5 text-muted-foreground text-pretty">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-14 sm:flex-row sm:items-center sm:justify-between lg:py-16">
          <div className="max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Order freshly milled rice today.
            </h2>
            <p className="mt-2 text-primary-foreground/80">
              Reselling or buying in bulk?{" "}
              <Link href="/contact" className="font-medium underline underline-offset-4 hover:text-primary-foreground">
                Contact us
              </Link>
              .
            </p>
          </div>
          <Link href="/order" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "shrink-0")}>
            Order rice
          </Link>
        </div>
      </section>
    </main>
  );
}
