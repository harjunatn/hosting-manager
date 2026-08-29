import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { PaymentReviewActions } from "@/components/payment-review-actions";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/money";
import {
  getClient,
  getInvoice,
  getPayment,
} from "@/modules/clients/queries";
import { createReceiptSignedUrl } from "@/modules/payments/actions";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) {
    notFound();
  }

  const [client, invoice, receiptUrl] = await Promise.all([
    getClient(payment.client_id),
    getInvoice(payment.invoice_id),
    payment.receipt_file_url
      ? createReceiptSignedUrl(payment.receipt_file_url)
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment review"
        description={client?.business_name ?? "Bank transfer receipt"}
      />
      <dl className="grid max-w-xl gap-4 rounded-xl border bg-card p-5 text-sm shadow-sm">
        <div>
          <dt className="text-muted-foreground">Client</dt>
          <dd className="font-medium">{client?.business_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Invoice</dt>
          <dd>{invoice?.invoice_number}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-medium tabular-nums">{formatMoney(payment.amount, payment.currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge value={payment.status} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Submitted</dt>
          <dd>
            {payment.submitted_at
              ? formatDate(payment.submitted_at.slice(0, 10))
              : "—"}
          </dd>
        </div>
        {payment.rejection_reason ? (
          <div>
            <dt className="text-muted-foreground">Rejection reason</dt>
            <dd>{payment.rejection_reason}</dd>
          </div>
        ) : null}
      </dl>
      {receiptUrl ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Receipt</p>
          {payment.receipt_file_url?.endsWith(".pdf") ? (
            <iframe
              title="Payment receipt"
              src={receiptUrl}
              className="h-[480px] w-full rounded-lg border"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receiptUrl}
              alt="Payment receipt"
              className="max-h-[480px] rounded-lg border"
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No receipt uploaded.</p>
      )}
      {payment.status === "PENDING_VERIFICATION" ? (
        <PaymentReviewActions paymentId={payment.id} />
      ) : null}
    </div>
  );
}
