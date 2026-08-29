import { ContactForm } from "@/components/contact-form";
import { SectionTitle } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listContacts } from "@/modules/clients/queries";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contacts = await listContacts(id);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableEmpty colSpan={3}>No contacts yet.</TableEmpty>
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="whitespace-normal font-medium">
                  {contact.name}
                  {contact.is_primary ? (
                    <span className="ml-2 text-xs font-normal text-primary">
                      primary
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {contact.email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.phone ?? "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <SectionTitle>Add contact</SectionTitle>
        <div className="mt-4">
          <ContactForm clientId={id} />
        </div>
      </div>
    </div>
  );
}
