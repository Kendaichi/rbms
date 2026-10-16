import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";

export default async function StoreHome() {
  const supabase = await createClient();
  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("name, price_per_kg")
      .eq("slug", "nsic-rc-160")
      .maybeSingle(),
    supabase
      .from("settings")
      .select("default_price_per_kg")
      .eq("id", true)
      .maybeSingle(),
  ]);

  const price = Number(
    product?.price_per_kg ?? settings?.default_price_per_kg ?? 60,
  );
  const name = product?.name ?? "Freshly Milled Rice (NSIC Rc 160)";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-14 text-center">
      <Image
        src="/logo.webp"
        alt="Rice Business Management System"
        width={200}
        height={200}
        priority
        className="h-40 w-40 object-contain"
      />

      <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold/15 px-3 py-1 text-sm font-medium text-brand-gold">
        Freshly milled · NSIC Rc 160
      </span>

      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {name}
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground text-pretty">
        Fresh-milled rice ordered online and delivered to your barangay. Pay on
        delivery or pickup — no account needed.
      </p>

      <div className="mt-6 inline-flex items-baseline gap-1 rounded-xl border bg-card px-5 py-3">
        <span className="text-3xl font-semibold text-primary">{peso(price)}</span>
        <span className="text-muted-foreground">/ kg</span>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/order" className={buttonVariants({ size: "lg" })}>
          Order rice
        </Link>
        <Link
          href="/track"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Track an order
        </Link>
      </div>

      <div className="mt-16 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-3">
        {[
          { t: "Order by the kilo", d: "Tell us how many kilos you need — 25, 50, 100 kg or more." },
          { t: "Milled fresh", d: "We mill your rice shortly before delivery for peak freshness." },
          { t: "Delivery or pickup", d: "Choose a date and time slot, or pick it up. Pay on receipt." },
        ].map((f) => (
          <div key={f.t} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
