"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-black tracking-tight">Something went wrong</h1>
      <p className="gm-muted mt-3 text-sm">
        We hit an unexpected error. Your data is safe — try again, and let us
        know if it keeps happening.
      </p>
      {error.digest && (
        <p className="gm-muted mt-2 font-mono text-xs">Reference: {error.digest}</p>
      )}
      <div className="mt-7 flex gap-3">
        <button type="button" onClick={reset} className="gm-btn-primary">
          Try again
        </button>
        <Link href="/" className="gm-btn-secondary">Go home</Link>
      </div>
    </main>
  );
}
