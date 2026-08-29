import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { InvoiceDocument } from "@/components/invoice-document";
import { SendInvoiceButton } from "@/components/send-invoice-button";
import { Button } from "@/components/ui/button";
import {
  getClient,
  getInvoice,
  getSubscription,
  listInvoiceItems,
} from "@/modules/clients/queries";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) {
    notFound();
  }

  const [client, items, subscription] = await Promise.all([
    getClient(invoice.client_id),
    listInvoiceItems(invoice.id),
    getSubscription(invoice.subscription_id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        actions={
          <div className="flex gap-2">
            {invoice.status === "DRAFT" ? (
              <SendInvoiceButton invoiceId={invoice.id} />
            ) : null}
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/admin/invoices/${invoice.id}/print`} />}
            >
              Print
            </Button>
          </div>
        }
      />
      <InvoiceDocument
        invoice={invoice}
        items={items}
        clientName={client?.billing_name ?? client?.business_name ?? "Client"}
        expiry={subscription?.current_period_end ?? null}
      />
    </div>
  );
}
