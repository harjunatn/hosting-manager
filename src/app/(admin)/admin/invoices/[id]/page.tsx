import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { InvoiceDocument } from "@/components/invoice-document";
import { SendInvoiceButton } from "@/components/send-invoice-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  getClient,
  getInvoice,
  getSubscription,
  listInvoiceItems,
} from "@/modules/clients/queries";
import { ZOHO_PROVIDER } from "@/integrations/invoice/zoho-books-invoice-provider";
import { listInvoiceEmailDeliveries } from "@/modules/emails/queries";

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

  const [client, items, subscription, deliveries] = await Promise.all([
    getClient(invoice.client_id),
    listInvoiceItems(invoice.id),
    getSubscription(invoice.subscription_id),
    listInvoiceEmailDeliveries(invoice.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        description={
          invoice.quotation_number
            ? `Quotation ${invoice.quotation_number}`
            : undefined
        }
        actions={
          <div className="flex gap-2">
            {invoice.status === "DRAFT" ? (
              <SendInvoiceButton invoiceId={invoice.id} />
            ) : null}
            {invoice.provider === ZOHO_PROVIDER &&
            invoice.external_invoice_id ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                Official PDF
              </Button>
            ) : null}
            {invoice.provider === ZOHO_PROVIDER &&
            invoice.external_quotation_id ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href={`/api/invoices/${invoice.id}/quotation-pdf`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                Quotation PDF
              </Button>
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
      <section className="space-y-3 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Email delivery</h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This invoice has not been emailed.
          </p>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{delivery.recipient_email}</p>
                  <p className="text-muted-foreground">
                    {delivery.email_type.replaceAll("_", " ")}
                    {delivery.delivery_email !== delivery.recipient_email
                      ? ` · test delivered to ${delivery.delivery_email}`
                      : ""}
                  </p>
                </div>
                <StatusBadge value={delivery.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
