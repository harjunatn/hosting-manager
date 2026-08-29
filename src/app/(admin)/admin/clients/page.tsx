import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TableLink } from "@/components/table-link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listClients } from "@/modules/clients/queries";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Companies with hosting subscriptions."
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/admin/clients/new" />}
            data-testid="new-client"
          >
            New client
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Billing name</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableEmpty colSpan={4}>No clients yet.</TableEmpty>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="max-w-[18rem] whitespace-normal">
                  <TableLink href={`/admin/clients/${client.id}`}>
                    {client.business_name}
                  </TableLink>
                </TableCell>
                <TableCell className="max-w-[18rem] whitespace-normal text-muted-foreground">
                  {client.billing_name}
                </TableCell>
                <TableCell className="tabular-nums">{client.default_currency}</TableCell>
                <TableCell>
                  <StatusBadge value={client.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
