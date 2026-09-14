"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/transactions", label: "Transactions" },
  { href: "/app/bank", label: "Bank" },
  { href: "/app/budgets", label: "Budgets" },
  { href: "/app/accounts", label: "Accounts" },
  { href: "/app/goals", label: "Goals" },
  { href: "/app/bills", label: "Bills" },
  { href: "/app/rules", label: "Rules" },
  { href: "/app/reports", label: "Reports" },
  { href: "/app/alerts", label: "Updates" },
  { href: "/app/billing", label: "Billing" },
];

/** `unread` puts a count beside Updates so new findings are not missed. */
export function AppNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="gm-scroll-x border-b border-[var(--gm-border)]">
      <ul className="mx-auto flex min-w-max max-w-6xl gap-1 px-4">
        {LINKS.map((link) => {
          const active =
            link.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "border-brand-600 text-brand-600"
                    : "gm-muted border-transparent hover:text-brand-600"
                }`}
              >
                {link.label}
                {link.href === "/app/alerts" && unread > 0 && (
                  <span
                    className="ml-1.5 inline-flex min-w-[1.15rem] justify-center rounded-full bg-[var(--gold)] px-1 py-px text-[10px] font-black text-[var(--wine-deep)]"
                    aria-label={`${unread} unread`}
                  >
                    {unread > 9 ? "9+" : unread}
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
