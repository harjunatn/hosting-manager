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
import { listPayments } from "@/modules/clients/queries";

export default async function ClientPaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payments = await listPayments({ clientId: id });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.length === 0 ? (
          <TableEmpty colSpan={3}>No payments for this client.</TableEmpty>
        ) : (
          payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="tabular-nums font-medium">
                <TableLink href={`/admin/payments/${payment.id}`}>
                  {formatMoney(payment.amount, payment.currency)}
                </TableLink>
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
  );
}
