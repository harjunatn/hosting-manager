import Link from "next/link";

import { logoutAction } from "@/modules/auth/actions";
import type { CurrentUser } from "@/modules/auth/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/renewals", label: "Renewals" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/payments", label: "Payments" },
];

const portalLinks = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/invoices", label: "Invoices" },
];

export function AppNav({
  user,
  pathname,
  variant,
}: {
  user: CurrentUser;
  pathname: string;
  variant: "admin" | "portal";
}) {
  const links = variant === "admin" ? adminLinks : portalLinks;
  const home = variant === "admin" ? "/admin" : "/portal";

  return (
    <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href={home} className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
              H
            </span>
            <span className="font-semibold tracking-tight">Hosting</span>
          </Link>
          <nav className="flex items-center gap-0.5">
            {links.map((link) => {
              const active =
                link.href === "/admin" || link.href === "/portal"
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-primary/10 font-medium text-primary",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.displayName}
          </span>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
