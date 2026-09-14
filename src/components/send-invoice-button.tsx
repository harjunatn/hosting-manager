"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { sendInvoiceAction } from "@/modules/invoices/actions";

function SendInvoiceSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-testid="send-invoice"
    >
      {pending ? "Sending…" : "Send quotation & invoice"}
    </Button>
  );
}

export function SendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async () => {
        setError(null);
        const result = await sendInvoiceAction(invoiceId);
        if (result && "error" in result && result.error) {
          setError(result.error);
        }
      }}
    >
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      <SendInvoiceSubmitButton />
    </form>
  );
}
