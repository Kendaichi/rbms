import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes relative metadata URLs (incl. the generated OG image) absolute.
  // Defaults to the production domain; override with NEXT_PUBLIC_SITE_URL for
  // previews/local if needed.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://rbms.daggerbuilds.com"
  ),
  title: "Rice Business Management System",
  description:
    "Freshly milled rice (NSIC Rc 160 Jasmine Rice) — order online for delivery or pickup.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-PH"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
