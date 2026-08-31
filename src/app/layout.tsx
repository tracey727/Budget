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
    "Gen Money is the Australian budgeting app that shows you exactly where every dollar goes. Start free, no credit card required.",
  keywords: [
    "budgeting app Australia",
    "personal finance AUD",
    "sole trader expenses",
    "GST tracking",
    "money management",
  ],
  openGraph: {
    title: "Gen Money — Take Control of Every Dollar",
    description:
      "The Australian budgeting app built for real life. Start free, no credit card required.",
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
