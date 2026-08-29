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
import { getDashboardData } from "@/modules/subscriptions/dashboard";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";

const filters = [
  { id: "all", label: "All" },
  { id: "30", label: "Next 30 days" },
  { id: "60", label: "Next 60 days" },
  { id: "expired", label: "Expired" },
] as const;

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const { rows } = await getDashboardData();
  const now = new Date();

  const filtered = rows.filter((row) => {
    const days = differenceInCalendarDays(
      new Date(`${row.current_period_end}T00:00:00.000Z`),
      now,
    );
    if (filter === "30") {
      return days >= 0 && days <= 30;
    }
    if (filter === "60") {
      return days >= 0 && days <= 60;
    }
    if (filter === "expired") {
      return days < 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upcoming renewals"
        description="Subscriptions sorted by expiry date."
      />
      <div className="flex flex-wrap gap-1.5">
        {filters.map((item) => (
          <TableLink
            key={item.id}
            href={`/admin/renewals?filter=${item.id}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm no-underline hover:no-underline",
              filter === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </TableLink>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Hosting</TableHead>
            <TableHead>Renewals paid</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Latest invoice</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableEmpty colSpan={8}>No matching renewals.</TableEmpty>
          ) : (
            filtered.map((row) => (
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
                <TableCell>{row.currency}</TableCell>
                <TableCell>
                  <StatusBadge value={row.effectiveStatus} />
                </TableCell>
                <TableCell>
                  {row.latestInvoiceStatus ? (
                    <StatusBadge value={row.latestInvoiceStatus} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
