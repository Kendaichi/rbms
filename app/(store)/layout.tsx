import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <span className="font-semibold tracking-tight">Freshly Milled Rice</span>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-2">
            <Link
              href="/contact"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3"
            >
              Contact
            </Link>
            <Link
              href="/track"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3"
            >
              Track
            </Link>
            <Link href="/order" className={buttonVariants({ size: "sm" })}>
              Order rice
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="flex items-center gap-3">
            <LogoMark className="size-8" />
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Freshly Milled Rice
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-4 border-t border-primary-foreground/15 pt-6 text-sm text-primary-foreground/75 sm:flex-row sm:items-center sm:justify-between">
            <p>NSIC Rc 160 · milled fresh · pay on delivery or pickup · Asia/Manila</p>
            <div className="flex items-center gap-4">
              <Link href="/order" className="hover:text-primary-foreground">Order</Link>
              <Link href="/track" className="hover:text-primary-foreground">Track</Link>
              <Link href="/contact" className="hover:text-primary-foreground">Contact</Link>
              <Link href="/login" className="hover:text-primary-foreground">Staff login</Link>
            </div>
          </div>
          <p className="mt-4 text-xs text-primary-foreground/60">
            Website by{" "}
            <a
              href="https://www.daggerbuilds.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline-offset-4 hover:text-primary-foreground hover:underline"
            >
              daggerbuilds
            </a>
          </p>
        </div>
      </footer>

      {/* Storefront-only analytics — mounted in the (store) layout so admin and
          staff login pages never load or send analytics. */}
      <Analytics />
    </div>
  );
}
