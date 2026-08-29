import { notFound } from "next/navigation";

import { InvoiceDocument } from "@/components/invoice-document";
import {
  getClient,
  getInvoice,
  getSubscription,
  listInvoiceItems,
} from "@/modules/clients/queries";

export default async function InvoicePrintPage({
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
    <div className="bg-white p-8 print:p-0">
      <InvoiceDocument
        invoice={invoice}
        items={items}
        clientName={client?.billing_name ?? client?.business_name ?? "Client"}
        expiry={subscription?.current_period_end ?? null}
      />
    </div>
  );
}
