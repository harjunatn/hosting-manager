import { HostingForm } from "@/components/hosting-form";
import { SectionTitle } from "@/components/page-header";
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
import { listHosting } from "@/modules/clients/queries";

export default async function HostingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hosting = await listHosting(id);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {hosting.length === 0 ? (
            <TableEmpty colSpan={5}>No hosting services yet.</TableEmpty>
          ) : (
            hosting.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                    {item.hosting_type}
                  </span>
                </TableCell>
                <TableCell>
                  {item.project_url ? (
                    <a
                      className="font-medium text-primary hover:underline"
                      href={item.project_url}
                    >
                      Open
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge value={item.status} />
                </TableCell>
                <TableCell>
                  <TableLink
                    href={`/admin/clients/${id}/hosting/${item.id}/edit`}
                    data-testid="edit-hosting"
                  >
                    Edit
                  </TableLink>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <SectionTitle>Add hosting</SectionTitle>
        <div className="mt-4">
          <HostingForm clientId={id} />
        </div>
      </div>
    </div>
  );
}
