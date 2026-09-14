"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { syncInvoiceZohoSentStatusAction } from "@/modules/invoices/actions";

export function SyncZohoStatusButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  return (
    <form
      action={async () => {
        setError(null);
        setSynced(false);
        const result = await syncInvoiceZohoSentStatusAction(invoiceId);
        if (result?.error) {
          setError(result.error);
        } else {
          setSynced(true);
        }
      }}
      className="space-y-1"
    >
      <SubmitButton size="sm" variant="outline">
        Sync Zoho status
      </SubmitButton>
      {error ? (
        <p className="max-w-64 text-xs text-destructive">{error}</p>
      ) : null}
      {synced ? (
        <p className="text-xs text-emerald-700">Zoho status synchronized.</p>
      ) : null}
    </form>
  );
}
