import { formatDate, formatMoney } from "@/lib/money";
import type { Invoice, InvoiceItem } from "@/lib/supabase/database.types";
import { StatusBadge } from "@/components/status-badge";
import { getEffectiveInvoiceStatus } from "@/modules/subscriptions/status";

export function InvoiceDocument({
  invoice,
  items,
  clientName,
  expiry,
  showStatus = true,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  clientName: string;
  expiry: string | null;
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-8 overflow-hidden rounded-xl border bg-card p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-primary/15 pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Invoice
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {invoice.invoice_number}
          </h2>
        </div>
        {showStatus ? (
          <StatusBadge value={getEffectiveInvoiceStatus(invoice, new Date())} />
        ) : null}
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Bill to</dt>
          <dd className="font-medium">{clientName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Issue date</dt>
          <dd className="tabular-nums">{formatDate(invoice.issue_date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Due date</dt>
          <dd className="tabular-nums">{formatDate(invoice.due_date)}</dd>
        </div>
        {expiry ? (
          <div>
            <dt className="text-muted-foreground">Current expiry</dt>
            <dd className="tabular-nums">{formatDate(expiry)}</dd>
          </div>
        ) : null}
      </dl>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
              Description
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
              Qty
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
              Unit
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-muted-foreground">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="px-3 py-3">{item.description}</td>
              <td className="px-3 py-3 tabular-nums">{item.quantity}</td>
              <td className="px-3 py-3 tabular-nums">
                {formatMoney(item.unit_price, invoice.currency)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-medium">
                {formatMoney(item.amount, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right text-lg font-semibold tabular-nums">
        Total {formatMoney(invoice.total, invoice.currency)}
      </p>
    </div>
  );
}
