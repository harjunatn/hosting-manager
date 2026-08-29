import { PageHeader } from "@/components/page-header";
import { TableLink } from "@/components/table-link";
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
import { requireClient } from "@/modules/auth/session";
import { listInvoices, listPayments } from "@/modules/clients/queries";
import {
  getClientPaymentNote,
  getLatestPaymentForInvoice,
} from "@/modules/payments/client-display";

export default async function PortalInvoicesPage() {
  const user = await requireClient();
  const [invoices, payments] = await Promise.all([
    listInvoices({ clientId: user.clientId! }),
    listPayments({ clientId: user.clientId! }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="View and pay your hosting invoices." />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableEmpty colSpan={4}>No invoices yet.</TableEmpty>
          ) : (
            invoices.map((invoice) => {
              const payment = getLatestPaymentForInvoice(payments, invoice.id);
              const note = getClientPaymentNote(payment);

              return (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div className="space-y-1">
                    <TableLink href={`/portal/invoices/${invoice.id}`}>
                      {invoice.invoice_number}
                    </TableLink>
                    {note ? (
                      <p className={`text-xs ${note.className}`}>{note.label}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(invoice.issue_date)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(invoice.due_date)}
                </TableCell>
                <TableCell className="tabular-nums font-medium">
                  {formatMoney(invoice.total, invoice.currency)}
                </TableCell>
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
