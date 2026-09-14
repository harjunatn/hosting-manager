"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { generateInvoiceAction } from "@/modules/invoices/actions";

export function GenerateInvoiceButton({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async () => {
        const result = await generateInvoiceAction(subscriptionId);
        if (result?.error) {
          setError(result.error);
        }
      }}
    >
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" data-testid="generate-invoice">
        Generate & send documents
      </Button>
    </form>
  );
}
