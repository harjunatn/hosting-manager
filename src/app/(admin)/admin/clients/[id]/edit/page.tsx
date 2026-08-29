import { notFound } from "next/navigation";

import { ClientForm } from "@/components/client-form";
import { getClient } from "@/modules/clients/queries";

export default async function EditClientPage({
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
      <h2 className="text-base font-semibold tracking-tight">Edit client</h2>
      <ClientForm client={client} />
    </div>
  );
}
