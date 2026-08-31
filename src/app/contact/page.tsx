import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Gen Money team.",
};

export default async function ContactPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <LegalPage title="Contact" updated="31 August 2026" signedIn={Boolean(user)}>
      <p>
        We read everything that comes in and aim to reply within two business
        days. Professional plan subscribers get priority support.
      </p>

      <h2>Support</h2>
      <p>
        For help with your account, billing, or anything that is not working as
        it should, email{" "}
        <a href="mailto:support@genmoney.com.au" className="font-semibold text-brand-600 hover:underline">
          support@genmoney.com.au
        </a>
        .
      </p>

      <h2>Privacy requests</h2>
      <p>
        To access, correct or delete your personal information, email{" "}
        <a href="mailto:privacy@genmoney.com.au" className="font-semibold text-brand-600 hover:underline">
          privacy@genmoney.com.au
        </a>
        .
      </p>

      <h2>Before you write in</h2>
      <p>
        Many questions are already answered on the{" "}
        <Link href="/pricing" className="font-semibold text-brand-600 hover:underline">
          pricing page
        </Link>
        , including how founding pricing works, how to change plans, and what
        happens to your data if you cancel.
      </p>

      <p className="gm-muted text-xs">
        Replace these addresses with your live support mailboxes before launch —
        see the deployment guide in the repository README.
      </p>
    </LegalPage>
  );
}
