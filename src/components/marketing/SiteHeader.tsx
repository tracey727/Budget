import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--gm-border)] bg-[var(--gm-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
        <Link href="/" aria-label="Genevieve App home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/#features" className="gm-muted hover:text-brand-600">
            Features
          </Link>
          <Link href="/pricing" className="gm-muted hover:text-brand-600">
            Pricing
          </Link>
          <Link href="/#security" className="gm-muted hover:text-brand-600">
            Security
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/app" className="gm-btn-primary">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="gm-btn-secondary hidden sm:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="gm-btn-primary">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
