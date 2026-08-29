"use client";

import { ClientTabs } from "@/components/client-tabs";
import { usePathname } from "next/navigation";

export function ClientTabsNav({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  return <ClientTabs clientId={clientId} pathname={pathname} />;
}
