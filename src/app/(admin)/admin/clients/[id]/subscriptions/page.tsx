import { notFound } from "next/navigation";

import { GenerateInvoiceButton } from "@/components/generate-invoice-button";
import { SectionTitle } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SubscriptionForm } from "@/components/subscription-form";
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
  getClient,
  listHosting,
  listInvoices,
  listSubscriptions,
} from "@/modules/clients/queries";
import {
  getEffectiveSubscriptionStatus,
  paidRenewalCount,
} from "@/modules/subscriptions/status";

export default async function SubscriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, hosting, subscriptions, invoices] = await Promise.all([
    getClient(id),
    listHosting(id),
    listSubscriptions(id),
    listInvoices({ clientId: id }),
  ]);
  if (!client) {
    notFound();
  }

  const unpaid = new Set(
    invoices
      .filter((invoice) => invoice.status === "SENT")
      .map((invoice) => invoice.subscription_id),
  );
  const subscribedHostingIds = new Set(
    subscriptions.map((subscription) => subscription.hosting_service_id),
  );
  const availableHosting = hosting.filter(
    (item) => !subscribedHostingIds.has(item.id),
  );

  return (
    <div className="space-y-8">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hosting</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Renewals paid</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.length === 0 ? (
            <TableEmpty colSpan={6}>No subscriptions yet.</TableEmpty>
          ) : (
            subscriptions.map((subscription) => {
              const service = hosting.find(
                (item) => item.id === subscription.hosting_service_id,
              );
              const periodInvoice =
                invoices.find(
                  (invoice) =>
                    invoice.subscription_id === subscription.id &&
                    invoice.billing_period_end ===
                      subscription.current_period_end &&
                    invoice.status !== "VOID",
                ) ??
                invoices.find(
                  (invoice) =>
                    invoice.subscription_id === subscription.id &&
                    invoice.billing_period_end === null &&
                    (invoice.status === "DRAFT" || invoice.status === "SENT"),
                ) ??
                null;

              return (
                <TableRow key={subscription.id}>
                  <TableCell className="font-medium">
                    {service?.name ?? "Hosting"}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatMoney(subscription.unit_price, subscription.currency)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {paidRenewalCount(
                      subscription.start_date,
                      subscription.current_period_end,
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(subscription.current_period_end)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      value={getEffectiveSubscriptionStatus(
                        subscription,
                        new Date(),
                        unpaid.has(subscription.id),
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <GenerateInvoiceButton
                      subscriptionId={subscription.id}
                      existingInvoice={
                        periodInvoice
                          ? {
                              id: periodInvoice.id,
                              invoice_number: periodInvoice.invoice_number,
                              status: periodInvoice.status,
                            }
                          : null
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="max-w-xl rounded-xl border bg-card p-5 shadow-sm">
        <SectionTitle>New yearly subscription</SectionTitle>
        <div className="mt-4">
          {hosting.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a hosting service before creating a subscription.
            </p>
          ) : availableHosting.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Each hosting service already has a subscription. Generate an
              invoice from the table above to start the next yearly renewal.
            </p>
          ) : (
            <SubscriptionForm
              clientId={id}
              hosting={availableHosting}
              defaultCurrency={client.default_currency}
            />
          )}
        </div>
      </div>
    </div>
  );
}
