import { TrackForm } from "./track-form";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Track an order</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your order number and the contact number you used.
      </p>
      <div className="mt-6">
        <TrackForm defaultOrderNo={no ?? ""} />
      </div>
    </main>
  );
}
