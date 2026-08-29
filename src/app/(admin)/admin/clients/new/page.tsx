import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New client"
        description="Create a company record before adding hosting and subscriptions."
      />
      <div className="max-w-xl rounded-xl border bg-card p-5 shadow-sm">
        <ClientForm />
      </div>
    </div>
  );
}
