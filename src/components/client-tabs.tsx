import Link from "next/link";

import { cn } from "@/lib/utils";

export function ClientTabs({
  clientId,
  pathname,
}: {
  clientId: string;
  pathname: string;
}) {
  const tabs = [
    { href: `/admin/clients/${clientId}`, label: "Overview", exact: true },
    { href: `/admin/clients/${clientId}/contacts`, label: "Contacts" },
    { href: `/admin/clients/${clientId}/hosting`, label: "Hosting" },
    { href: `/admin/clients/${clientId}/subscriptions`, label: "Subscription" },
    { href: `/admin/clients/${clientId}/invoices`, label: "Invoices" },
    { href: `/admin/clients/${clientId}/payments`, label: "Payments" },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground",
              active && "border-primary font-medium text-primary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
