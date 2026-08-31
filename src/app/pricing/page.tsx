import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PagedPricing } from "@/components/marketing/PagedPricing";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Genevieve App pricing in AUD. Starter is free. Personal Premium $9.99/month or $99/year. Professional $19.99/month or $199/year. Founding member pricing available at launch.",
};

export default async function PricingPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(user)} />
      <main className="flex-1">
        <PagedPricing signedIn={Boolean(user)} />
      </main>
      <SiteFooter />
    </div>
  );
}
