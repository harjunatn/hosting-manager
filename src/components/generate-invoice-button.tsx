"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

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
}: {
  subscriptionId: string;
}) {
  const [error, setError] = useState<string | null>(null);

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
      <GenerateInvoiceSubmitButton />
    </form>
  );
}
