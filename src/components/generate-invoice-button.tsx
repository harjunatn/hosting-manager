"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { TableLink } from "@/components/table-link";
import { Button } from "@/components/ui/button";
import { generateInvoiceAction } from "@/modules/invoices/actions";

function GenerateInvoiceSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      data-testid="generate-invoice"
    >
      {pending ? "Generating & sending…" : "Generate & send documents"}
    </Button>
  );
}

export function GenerateInvoiceButton({
  subscriptionId,
  existingInvoice,
}: {
  subscriptionId: string;
  existingInvoice?: {
    id: string;
    invoice_number: string;
    status: string;
  } | null;
}) {
  const [error, setError] = useState<string | null>(null);

  if (
    existingInvoice &&
    (existingInvoice.status === "SENT" || existingInvoice.status === "PAID")
  ) {
    return (
      <div className="max-w-48 space-y-1 text-right">
        <p className="text-xs text-muted-foreground">
          Documents already sent
        </p>
        <TableLink
          href={`/admin/invoices/${existingInvoice.id}`}
          className="text-sm"
          data-testid="existing-invoice-link"
        >
          {existingInvoice.invoice_number}
        </TableLink>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        setError(null);
        const result = await generateInvoiceAction(subscriptionId);
        if (result?.error) {
          setError(result.error);
        }
      }}
    >
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      {existingInvoice?.status === "DRAFT" ? (
        <p className="mb-1 text-xs text-muted-foreground">
          Draft ready — send now
        </p>
      ) : null}
      <GenerateInvoiceSubmitButton />
    </form>
  );
}
