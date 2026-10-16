import Image from "next/image";
import Link from "next/link";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/tab-icon.webp"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-sm object-contain"
            />
            <span className="hidden font-semibold tracking-tight sm:inline">
              Rice Business Management System
            </span>
            <span className="font-semibold tracking-tight sm:hidden">RBMS</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/order"
              className="rounded-md px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
            >
              Order
            </Link>
            <Link
              href="/track"
              className="rounded-md px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
            >
              Track
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl px-6 py-5 text-center text-xs text-muted-foreground">
          Freshly milled rice · NSIC Rc 160 · pay on delivery or pickup
        </div>
      </footer>
    </div>
  );
}
