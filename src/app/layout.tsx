import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://genmoney.com.au",
  ),
  title: {
    default: "Gen Money — Take Control of Every Dollar",
    template: "%s · Gen Money",
  },
  description:
    "Gen Money is the travellers budget — the Australian app that shows you what your trip is costing while you are still on it. Start free, no credit card required.",
  keywords: [
    "travel budget app Australia",
    "caravan trip budget",
    "grey nomad budgeting",
    "fuel and camping costs",
    "road trip expenses AUD",
    "sole trader expenses",
  ],
  openGraph: {
    title: "Gen Money — Take Control of Every Dollar",
    description:
      "The travellers budget. Know what the trip is costing while you are still on it. Start free, no credit card required.",
    type: "website",
    locale: "en_AU",
    siteName: "Gen Money",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#12161f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body className="antialiased">{children}</body>
    </html>
  );
}
