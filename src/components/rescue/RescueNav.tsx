"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/rescue", label: "Dashboard" },
  { href: "/rescue/queue", label: "Action queue" },
  { href: "/rescue/findings", label: "Findings" },
  { href: "/rescue/imports", label: "Import Centre" },
  { href: "/rescue/rules", label: "Rules" },
  { href: "/rescue/audit", label: "Audit" },
  { href: "/rescue/users", label: "Users" },
  { href: "/rescue/settings", label: "Settings" },
];

export function RescueNav({ redCount = 0 }: { redCount?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Revenue Rescue" className="gm-scroll-x border-b border-[var(--gm-border)]">
      <ul className="mx-auto flex min-w-max max-w-6xl gap-1 px-4">
        {LINKS.map((link) => {
          const active = link.href === "/rescue" ? pathname === "/rescue" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                  active ? "border-brand-600 text-brand-600" : "gm-muted border-transparent hover:text-brand-600"
                }`}
              >
                {link.label}
                {link.href === "/rescue/queue" && redCount > 0 && (
                  <span
                    className="ml-1.5 inline-flex min-w-[1.15rem] justify-center rounded-full bg-[var(--gold)] px-1 py-px text-[10px] font-black text-[var(--wine-deep)]"
                    aria-label={`${redCount} red findings`}
                  >
                    {redCount > 9 ? "9+" : redCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
