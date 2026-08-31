import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="mb-9" aria-label="Genevieve App home">
        <Logo size="md" />
      </Link>
      <h1 className="gm-display text-6xl font-semibold">404</h1>
      <p className="gm-muted mt-3">
        We could not find that page. It may have moved, or the link may be out of
        date.
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/" className="gm-btn-primary">Go home</Link>
        <Link href="/app" className="gm-btn-secondary">Open the app</Link>
      </div>
    </main>
  );
}
