import { notFound } from "next/navigation";

import { HostingForm } from "@/components/hosting-form";
import { getHosting } from "@/modules/clients/queries";

export default async function EditHostingPage({
  params,
}: {
  params: Promise<{ id: string; hostingId: string }>;
}) {
  const { id, hostingId } = await params;
  const hosting = await getHosting(hostingId);
  if (!hosting || hosting.client_id !== id) {
    notFound();
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">Edit hosting</h2>
      <HostingForm clientId={id} hosting={hosting} />
    </div>
  );
}
