import type { Metadata } from "next";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { Grain } from "@/components/store/grain";
import { buttonVariants } from "@/components/ui/button";
import { CONTACT } from "@/lib/contact";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reseller & bulk supply — Freshly Milled Rice",
  description:
    "Buy NSIC Rc 160 in bulk or resell it. Contact us to set up supply for your store.",
};

const OFFERS = [
  {
    t: "Fair price by the kilo",
    d: "Reseller and bulk pricing scaled to your volume — ask for a quote for your usual order.",
  },
  {
    t: "Milled to order",
    d: "We mill NSIC Rc 160 close to delivery, so what you sell is fresh, not months-old stock.",
  },
  {
    t: "Reliable, scheduled supply",
    d: "Set a regular delivery to your store or barangay. Pay on delivery, with utang terms for regulars.",
  },
];

export default function ContactPage() {
  const hasEmail = CONTACT.email.length > 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 lg:py-16">
      <Grain className="size-7 text-brand-gold" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Reselling or buying in bulk?
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground text-pretty">
        We supply freshly milled NSIC Rc 160 to resellers, sari-sari stores and
        bulk buyers. Tell us your volume and delivery area and we&rsquo;ll set you up.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <section className="space-y-6">
          {OFFERS.map((o) => (
            <div key={o.t} className="flex gap-3.5">
              <Grain className="mt-1 size-5 shrink-0 text-brand-gold" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{o.t}</h2>
                <p className="mt-1 text-muted-foreground text-pretty">{o.d}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-secondary p-6 text-secondary-foreground sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Contact us</h2>
          <p className="mt-1 text-sm text-secondary-foreground/80">
            Call or text — fastest for a quote.
          </p>

          <a
            href={CONTACT.phoneHref}
            className="mt-5 flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-card-foreground transition-colors hover:bg-card/80"
          >
            <Phone className="size-5 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Call us</span>
              <span className="block text-lg font-semibold tabular-nums">
                {CONTACT.phoneDisplay}
              </span>
            </span>
          </a>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <a href={CONTACT.phoneHref} className={buttonVariants({ size: "lg" })}>
              <Phone className="size-4" />
              Call
            </a>
            <a
              href={CONTACT.smsHref}
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              <MessageSquare className="size-4" />
              Text
            </a>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-secondary-foreground/15 px-4 py-3 text-sm">
            <Mail className="size-5 shrink-0 text-secondary-foreground/70" />
            {hasEmail ? (
              <a href={`mailto:${CONTACT.email}`} className="font-medium hover:underline">
                {CONTACT.email}
              </a>
            ) : (
              <span className="text-secondary-foreground/70">
                Email — <span className="font-medium">coming soon</span>
              </span>
            )}
          </div>

          <p className="mt-4 text-xs text-secondary-foreground/70">
            Include your store/name, how many kilos, how often, and your delivery
            area so we can quote quickly.
          </p>
        </section>
      </div>
    </main>
  );
}
