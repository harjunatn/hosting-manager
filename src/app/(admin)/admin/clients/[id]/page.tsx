import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getClient } from "@/modules/clients/queries";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) {
    notFound();
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Row label="Country" value={client.country ?? "—"} />
        <Row label="Currency" value={client.default_currency} />
        <Row label="Status" value={<StatusBadge value={client.status} />} />
        <Row label="Address" value={client.billing_address ?? "—"} />
        <Row label="Remarks" value={client.remarks ?? "—"} />
      </dl>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/admin/clients/${id}/edit`} />}
      >
        Edit client
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
