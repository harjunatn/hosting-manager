import { PageHeader } from "@/components/page-header";
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
import { listClients, listInvoices } from "@/modules/clients/queries";
import { getEffectiveInvoiceStatus } from "@/modules/subscriptions/status";

export default async function InvoicesPage() {
  const [invoices, clients] = await Promise.all([listInvoices(), listClients()]);
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Draft, sent, and paid hosting invoices."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableEmpty colSpan={5}>No invoices yet.</TableEmpty>
          ) : (
            invoices.map((invoice) => (
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
                  <StatusBadge value={getEffectiveInvoiceStatus(invoice, now)} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
