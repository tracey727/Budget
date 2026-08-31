import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "rgba(20, 3, 6, 0.86)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--gold-line)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Genevieve App home">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm md:flex">
          {[
            { href: "/#features", label: "Features" },
            { href: "/pricing", label: "Pricing" },
            { href: "/#security", label: "Security" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="gm-muted font-medium tracking-wide transition hover:text-brand-600"
            >
              {item.label}
            </Link>
          ))}
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
