import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Gen Money collects, uses and protects your personal information.",
};

export default async function PrivacyPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <LegalPage title="Privacy Policy" updated="31 August 2026" signedIn={Boolean(user)}>
      <p>
        This policy explains how Gen Money handles personal information, in line
        with the Australian Privacy Principles under the Privacy Act 1988 (Cth).
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, an
          encrypted form of your password, and optionally your state or
          territory.
        </li>
        <li>
          <strong>Financial records you enter:</strong> account names, balances,
          transactions, budgets, goals and bills. This is information you choose
          to give us.
        </li>
        <li>
          <strong>Billing details:</strong> your subscription status and a Stripe
          customer reference. Card numbers go directly to Stripe and are never
          stored by us.
        </li>
        <li>
          <strong>Technical information:</strong> standard server logs needed to
          run and secure the service.
        </li>
      </ul>

      <h2>2. What we do not collect</h2>
      <p>
        We do not ask for or store your internet banking credentials. Gen Money
        does not connect to your bank, screen-scrape, or initiate payments. You
        add transactions yourself, or import a statement you have exported.
      </p>

      <h2>3. How we use it</h2>
      <ul>
        <li>To provide the service and show you your own data.</li>
        <li>To process subscription payments through Stripe.</li>
        <li>To send service messages about your account or billing.</li>
        <li>To keep the service secure and diagnose faults.</li>
      </ul>
      <p>
        We do not sell your personal information. We do not use your financial
        records for advertising.
      </p>

      <h2>4. Who we share it with</h2>
      <p>We use a small number of service providers to run Gen Money:</p>
      <ul>
        <li><strong>Cloudflare</strong> — application hosting and network security.</li>
        <li><strong>Neon</strong> — the encrypted Postgres database that stores your records.</li>
        <li><strong>Stripe</strong> — subscription payments.</li>
      </ul>
      <p>
        Some of these providers may process or store data outside Australia. We
        take reasonable steps to ensure any overseas recipient handles your
        information consistently with the Australian Privacy Principles. We may
        also disclose information where required by law.
      </p>

      <h2>5. Security</h2>
      <ul>
        <li>All traffic is served over HTTPS.</li>
        <li>Passwords are stored as salted PBKDF2-SHA256 hashes, never in plain text.</li>
        <li>Session tokens are stored as hashes, so a database copy cannot be used to sign in as you.</li>
        <li>Every database query is scoped to the signed-in account.</li>
      </ul>
      <p>
        No system is perfectly secure. If we become aware of a data breach likely
        to cause you serious harm, we will notify you and the Office of the
        Australian Information Commissioner as required by the Notifiable Data
        Breaches scheme.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep your data while your account is open. If you delete your account
        we remove your personal information and financial records, except where
        we must retain limited billing records to meet legal and tax obligations.
      </p>

      <h2>7. Your rights</h2>
      <ul>
        <li>Access the personal information we hold about you.</li>
        <li>Ask us to correct anything that is wrong.</li>
        <li>Export your records to CSV on a paid plan.</li>
        <li>Delete your account and the data in it.</li>
        <li>Complain if you think we have mishandled your information.</li>
      </ul>
      <p>
        If you are not satisfied with our response to a privacy complaint, you
        can contact the Office of the Australian Information Commissioner at
        oaic.gov.au.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Gen Money sets one essential cookie to keep you signed in. It is
        HttpOnly, restricted to this site, and is not used for advertising or
        cross-site tracking.
      </p>

      <h2>9. Children</h2>
      <p>Gen Money is not intended for people under 18.</p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy. Material changes will be notified in the app
        or by email before they take effect.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions and requests can be sent through the contact page.
      </p>
    </LegalPage>
  );
}
