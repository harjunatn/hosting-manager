import { differenceInCalendarDays } from "date-fns";

import type { Client, Invoice, Subscription } from "@/lib/supabase/database.types";
import {
  getEffectiveInvoiceStatus,
  getEffectiveSubscriptionStatus,
  paidRenewalCount,
} from "@/modules/subscriptions/status";
import {
  listAllHosting,
  listClients,
  listInvoices,
  listSubscriptions,
} from "@/modules/clients/queries";

export type SubscriptionRow = Subscription & {
  client: Client | null;
  hostingName: string;
  hostingType: string;
  effectiveStatus: ReturnType<typeof getEffectiveSubscriptionStatus>;
  latestInvoiceStatus: ReturnType<typeof getEffectiveInvoiceStatus> | null;
  renewalsPaid: number;
};

export async function getDashboardData(now = new Date()) {
  const [clients, subscriptions, invoices, hosting] = await Promise.all([
    listClients(),
    listSubscriptions(),
    listInvoices(),
    listAllHosting(),
  ]);

  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const unpaidSent = new Set(
    invoices
      .filter((invoice) => invoice.status === "SENT")
      .map((invoice) => invoice.subscription_id),
  );

  const latestBySubscription = new Map<string, Invoice>();
  for (const invoice of invoices) {
    if (!latestBySubscription.has(invoice.subscription_id)) {
      latestBySubscription.set(invoice.subscription_id, invoice);
    }
  }

  const hostingMap = new Map(hosting.map((item) => [item.id, item]));

  const rows: SubscriptionRow[] = subscriptions.map((subscription) => {
    const latest = latestBySubscription.get(subscription.id) ?? null;
    const service = hostingMap.get(subscription.hosting_service_id);
    return {
      ...subscription,
      client: clientMap.get(subscription.client_id) ?? null,
      hostingName: service?.name ?? "Hosting",
      hostingType: service?.hosting_type ?? "",
      effectiveStatus: getEffectiveSubscriptionStatus(
        subscription,
        now,
        unpaidSent.has(subscription.id),
      ),
      latestInvoiceStatus: latest
        ? getEffectiveInvoiceStatus(latest, now)
        : null,
      renewalsPaid: paidRenewalCount(
        subscription.start_date,
        subscription.current_period_end,
      ),
    };
  });

  const active = rows.filter((row) => row.effectiveStatus === "ACTIVE").length;
  const expiring = rows.filter((row) => {
    const days = differenceInCalendarDays(
      new Date(`${row.current_period_end}T00:00:00.000Z`),
      now,
    );
    return days >= 0 && days <= 30 && row.status !== "CANCELLED";
  }).length;
  const awaitingPayment = invoices.filter((invoice) => invoice.status === "SENT").length;
  const overdue = invoices.filter(
    (invoice) => getEffectiveInvoiceStatus(invoice, now) === "OVERDUE",
  ).length;

  return {
    clients,
    invoices,
    rows,
    counts: { active, expiring, awaitingPayment, overdue },
  };
}
