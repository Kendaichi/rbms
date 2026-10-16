import { Grain } from "@/components/store/grain";
import { TrackForm } from "./track-form";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12 lg:py-16">
      <Grain className="size-7 text-brand-gold" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Track an order</h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        Enter your order number and the contact number you used when ordering.
      </p>
      <div className="mt-8">
        <TrackForm defaultOrderNo={no ?? ""} />
      </div>
    </main>
  );
}
