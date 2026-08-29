import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TableLink } from "@/components/table-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/money";
import { requireClient } from "@/modules/auth/session";
import {
  listHosting,
  listInvoices,
  listPayments,
  listSubscriptions,
} from "@/modules/clients/queries";
import {
  getClientPaymentNote,
  getLatestPaymentForInvoice,
} from "@/modules/payments/client-display";
import {
  getEffectiveSubscriptionStatus,
  paidRenewalCount,
} from "@/modules/subscriptions/status";

export default async function PortalDashboardPage() {
  const user = await requireClient();
  const clientId = user.clientId!;
  const [hosting, subscriptions, invoices, payments] = await Promise.all([
    listHosting(clientId),
    listSubscriptions(clientId),
    listInvoices({ clientId }),
    listPayments({ clientId }),
  ]);

  const unpaid = new Set(
    invoices
      .filter((invoice) => invoice.status === "SENT")
      .map((invoice) => invoice.subscription_id),
  );
  const now = new Date();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your hosting, subscription, and invoices."
      />
      <section className="space-y-3">
        <SectionTitle>Hosting</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {hosting.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{item.name}</span>
                  <StatusBadge value={item.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                    {item.hosting_type}
                  </span>
                </p>
                {item.project_url ? (
                  <a className="font-medium text-primary hover:underline" href={item.project_url}>
                    {item.project_url}
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>Subscription</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="bg-emerald-50/60 ring-1 ring-emerald-100">
              <CardHeader>
                <CardTitle>
                  {formatMoney(subscription.unit_price, subscription.currency)} / year
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="tabular-nums text-muted-foreground">
                  {paidRenewalCount(
                    subscription.start_date,
                    subscription.current_period_end,
                  )}{" "}
                  renewals paid · Expiry {formatDate(subscription.current_period_end)}
                </p>
                <StatusBadge
                  value={getEffectiveSubscriptionStatus(
                    subscription,
                    now,
                    unpaid.has(subscription.id),
                  )}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle
          action={
            <TableLink href="/portal/invoices" className="text-sm">
              View all
            </TableLink>
          }
        >
          Invoices
        </SectionTitle>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {invoices.slice(0, 5).map((invoice) => {
            const payment = getLatestPaymentForInvoice(payments, invoice.id);
            const note = getClientPaymentNote(payment);

            return (
            <li
              key={invoice.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="space-y-0.5">
                <TableLink href={`/portal/invoices/${invoice.id}`}>
                  {invoice.invoice_number}
                </TableLink>
                {note ? (
                  <p className={`text-xs ${note.className}`}>{note.label}</p>
                ) : null}
              </div>
              <span className="tabular-nums text-sm text-muted-foreground">
                {formatMoney(invoice.total, invoice.currency)}
              </span>
            </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
