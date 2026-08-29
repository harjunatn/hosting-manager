import { StatusBadge } from "@/components/status-badge";
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
import { listInvoices } from "@/modules/clients/queries";
import { getEffectiveInvoiceStatus } from "@/modules/subscriptions/status";

export default async function ClientInvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoices = await listInvoices({ clientId: id });
  const now = new Date();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Issue</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length === 0 ? (
          <TableEmpty colSpan={5}>No invoices for this client.</TableEmpty>
        ) : (
          invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <TableLink href={`/admin/invoices/${invoice.id}`}>
                  {invoice.invoice_number}
                </TableLink>
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
              <TableCell>
                <StatusBadge value={getEffectiveInvoiceStatus(invoice, now)} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
