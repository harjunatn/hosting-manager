"use client";

import { usePathname } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import type { CurrentUser } from "@/modules/auth/types";

export function AppShell({
  user,
  variant,
  children,
}: {
  user: CurrentUser;
  variant: "admin" | "portal";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-full bg-background">
      <AppNav user={user} pathname={pathname} variant={variant} />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
