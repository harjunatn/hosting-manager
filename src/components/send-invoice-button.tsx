"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { sendInvoiceAction } from "@/modules/invoices/actions";

export function SendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async () => {
        const result = await sendInvoiceAction(invoiceId);
        if (result && "error" in result && result.error) {
          setError(result.error);
        }
      }}
    >
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" data-testid="send-invoice">
        Send quotation & invoice
      </Button>
    </form>
  );
}
