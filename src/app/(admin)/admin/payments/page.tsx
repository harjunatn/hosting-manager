import Link from "next/link";

import { MarkInvoicePaidButton } from "@/components/mark-invoice-paid-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TableLink } from "@/components/table-link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/money";
import {
  listClients,
  listInvoices,
  listPayments,
} from "@/modules/clients/queries";

export default async function PaymentsPage() {
  const [payments, clients, invoices] = await Promise.all([
    listPayments(),
    listClients(),
    listInvoices(),
  ]);
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const awaitingInvoices = invoices.filter((invoice) => invoice.status === "SENT");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Review outstanding invoices and record bank transfer payments."
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Awaiting payment</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {awaitingInvoices.length === 0 ? (
              <TableEmpty colSpan={5}>No sent invoices awaiting payment.</TableEmpty>
            ) : (
              awaitingInvoices.map((invoice) => {
                const submittedPayment = payments.find(
                  (payment) =>
                    payment.invoice_id === invoice.id &&
                    payment.status === "PENDING_VERIFICATION",
                );

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <TableLink href={`/admin/invoices/${invoice.id}`}>
                        {invoice.invoice_number}
                      </TableLink>
                    </TableCell>
                    <TableCell className="max-w-[16rem] whitespace-normal">
                      {clientMap.get(invoice.client_id)?.business_name ?? "Client"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {formatMoney(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      {submittedPayment ? (
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={
                            <Link href={`/admin/payments/${submittedPayment.id}`} />
                          }
                        >
                          Review receipt
                        </Button>
                      ) : (
                        <MarkInvoicePaidButton
                          invoiceId={invoice.id}
                          invoiceNumber={invoice.invoice_number}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payment history</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableEmpty colSpan={4}>No payments recorded yet.</TableEmpty>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="max-w-[16rem] whitespace-normal">
                    <TableLink href={`/admin/payments/${payment.id}`}>
                      {clientMap.get(payment.client_id)?.business_name ?? "Client"}
                    </TableLink>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatMoney(payment.amount, payment.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={payment.status} />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {payment.submitted_at
                      ? formatDate(payment.submitted_at.slice(0, 10))
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
