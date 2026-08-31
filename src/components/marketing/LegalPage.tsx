import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function LegalPage({
  title,
  updated,
  signedIn,
  children,
}: {
  title: string;
  updated: string;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={signedIn} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14">
        <h1 className="gm-display text-4xl font-semibold sm:text-5xl">{title}</h1>
        <p className="gm-muted mt-2 text-sm">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:mt-9 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-brand-600 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
