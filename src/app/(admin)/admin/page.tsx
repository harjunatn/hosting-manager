import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TableLink } from "@/components/table-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getDashboardData } from "@/modules/subscriptions/dashboard";

export default async function AdminDashboardPage() {
  const { counts, rows } = await getDashboardData();
  const upcoming = rows.slice(0, 8);

  const stats = [
    {
      label: "Active subscriptions",
      value: counts.active,
      className: "bg-emerald-50 ring-emerald-100",
      valueClass: "text-emerald-800",
    },
    {
      label: "Expiring within 30 days",
      value: counts.expiring,
      className: "bg-amber-50 ring-amber-100",
      valueClass: "text-amber-800",
    },
    {
      label: "Awaiting payment",
      value: counts.awaitingPayment,
      className: "bg-sky-50 ring-sky-100",
      valueClass: "text-sky-800",
    },
    {
      label: "Overdue invoices",
      value: counts.overdue,
      className: "bg-rose-50 ring-rose-100",
      valueClass: "text-rose-800",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Hosting renewals and invoices at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm" className={stat.className}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-semibold tabular-nums ${stat.valueClass}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <SectionTitle
          action={
            <TableLink href="/admin/renewals" className="text-sm">
              View all
            </TableLink>
          }
        >
          Upcoming renewals
        </SectionTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Hosting</TableHead>
              <TableHead>Renewals paid</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcoming.length === 0 ? (
              <TableEmpty colSpan={6}>No subscriptions yet.</TableEmpty>
            ) : (
              upcoming.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[16rem] whitespace-normal">
                    <TableLink href={`/admin/clients/${row.client_id}`}>
                      {row.client?.business_name ?? "Client"}
                    </TableLink>
                  </TableCell>
                  <TableCell>{row.hostingName}</TableCell>
                  <TableCell className="tabular-nums">{row.renewalsPaid}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(row.current_period_end)}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatMoney(row.unit_price, row.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.effectiveStatus} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
