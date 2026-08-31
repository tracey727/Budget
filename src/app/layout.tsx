import type { Metadata, Viewport } from "next";
import { Great_Vibes, Cormorant_Garamond, Lato } from "next/font/google";
import "./globals.css";

/** The cursive used only for the Genevieve wordmark. */
const script = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-script",
});

/** Headings and figures — a refined serif to carry the premium feel. */
const display = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

/** Body and interface text — warm, and legible at small sizes. */
const body = Lato({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://genevieveapp.com.au",
  ),
  title: {
    default: "Genevieve App — Budget App | Take Control of Every Dollar",
    template: "%s · Genevieve App",
  },
  description:
    "Genevieve App is the Australian budgeting app that shows you exactly where every dollar goes. Start free, no credit card required.",
  keywords: [
    "budgeting app Australia",
    "personal finance AUD",
    "sole trader expenses",
    "GST tracking",
    "money management",
  ],
  openGraph: {
    title: "Genevieve App — Budget App",
    description:
      "Take control of every dollar. The Australian budgeting app built for real life. Start free, no credit card required.",
    type: "website",
    locale: "en_AU",
    siteName: "Genevieve App",
  },
  icons: {
    icon: "/genevieve-logo.png",
    apple: "/genevieve-logo.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e0509",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-AU"
      className={`${script.variable} ${display.variable} ${body.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
