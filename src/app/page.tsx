import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PagedHome } from "@/components/marketing/PagedHome";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(user)} />
      <main className="flex-1">
        <PagedHome signedIn={Boolean(user)} />
      </main>
      <SiteFooter />
    </div>
  );
}
