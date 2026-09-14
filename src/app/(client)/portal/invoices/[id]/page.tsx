import { notFound } from "next/navigation";

import { InvoiceDocument } from "@/components/invoice-document";
import { PaymentReceiptForm } from "@/components/payment-receipt-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ZOHO_PROVIDER } from "@/integrations/invoice/zoho-books-invoice-provider";
import { getBankDetails } from "@/lib/bank";
import { requireClient } from "@/modules/auth/session";
import {
  getClient,
  getInvoice,
  getSubscription,
  listInvoiceItems,
  listPayments,
} from "@/modules/clients/queries";
import { getLatestPaymentForInvoice } from "@/modules/payments/client-display";

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClient();
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice || invoice.client_id !== user.clientId) {
    notFound();
  }

  const [client, items, subscription, payments] = await Promise.all([
    getClient(invoice.client_id),
    listInvoiceItems(invoice.id),
    getSubscription(invoice.subscription_id),
    listPayments({ clientId: invoice.client_id }),
  ]);

  const payment = getLatestPaymentForInvoice(payments, invoice.id);
  const bank = getBankDetails();
  const canPay = invoice.status === "SENT";

  return (
    <div className="space-y-8">
      {invoice.provider === ZOHO_PROVIDER && invoice.external_invoice_id ? (
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
          Download official invoice PDF
        </Button>
      ) : null}
      <InvoiceDocument
        invoice={invoice}
        items={items}
        clientName={client?.billing_name ?? client?.business_name ?? "Client"}
        expiry={subscription?.current_period_end ?? null}
        showStatus={false}
      />
      {canPay ? (
        <section className="max-w-xl space-y-4 rounded-xl border border-sky-100 bg-sky-50/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Pay by bank transfer</h2>
          {payment?.status === "REJECTED" ? (
            <Alert variant="destructive">
              <AlertTitle>Payment not accepted</AlertTitle>
              <AlertDescription>
                {payment.rejection_reason
                  ? `Your receipt was rejected: ${payment.rejection_reason}. Please upload a new receipt below.`
                  : "Your receipt was not accepted. Please upload a new receipt below."}
              </AlertDescription>
            </Alert>
          ) : null}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Bank</dt>
              <dd className="font-medium">{bank.bankName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account name</dt>
              <dd className="text-right font-medium">{bank.accountName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account number</dt>
              <dd className="font-mono font-medium">{bank.accountNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">SWIFT</dt>
              <dd className="font-mono">{bank.swift}</dd>
            </div>
          </dl>
          {payment?.status === "PENDING_VERIFICATION" ? (
            <p className="text-sm">Receipt submitted. Waiting for verification.</p>
          ) : (
            <PaymentReceiptForm invoiceId={invoice.id} />
          )}
        </section>
      ) : null}
    </div>
  );
}
