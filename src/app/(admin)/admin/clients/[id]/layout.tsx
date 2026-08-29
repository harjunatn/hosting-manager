import { notFound } from "next/navigation";

import { ClientTabsNav } from "@/components/client-tabs-nav";
import { StatusBadge } from "@/components/status-badge";
import { getClient } from "@/modules/clients/queries";

export default async function ClientDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Client
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {client.business_name}
          </h1>
          <p className="text-sm text-muted-foreground">{client.billing_name}</p>
        </div>
        <StatusBadge value={client.status} />
      </div>
      <ClientTabsNav clientId={id} />
      {children}
    </div>
  );
}
