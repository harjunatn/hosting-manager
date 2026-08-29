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
import { listClients, listPayments } from "@/modules/clients/queries";

export default async function PaymentsPage() {
  const [payments, clients] = await Promise.all([listPayments(), listClients()]);
  const clientMap = new Map(clients.map((client) => [client.id, client]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Bank transfer receipts waiting for review."
      />
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
            <TableEmpty colSpan={4}>No payments submitted yet.</TableEmpty>
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
    </div>
  );
}
