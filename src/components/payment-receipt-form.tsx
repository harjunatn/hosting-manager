"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  submitPaymentReceiptAction,
  type PaymentActionState,
} from "@/modules/payments/actions";
import {
  formatReceiptMaxSize,
  RECEIPT_ACCEPT,
  validateReceiptFile,
} from "@/modules/payments/receipt-validation";

export function PaymentReceiptForm({ invoiceId }: { invoiceId: string }) {
  const [state, formAction] = useActionState<PaymentActionState, FormData>(
    submitPaymentReceiptAction.bind(null, invoiceId),
    null,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validationError = selectedFile ? validateReceiptFile(selectedFile) : null;
  const error = clientError ?? validationError ?? state?.error ?? null;
  const canSubmit = selectedFile !== null && validationError === null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setClientError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem(
      "receipt",
    ) as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const message = validateReceiptFile(file);
    if (message) {
      event.preventDefault();
      setClientError(message);
      return;
    }
    setClientError(null);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="receipt">Upload payment receipt</Label>
        <Input
          id="receipt"
          name="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          required
          data-testid="receipt-file"
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground">
          PDF, JPG, or PNG up to {formatReceiptMaxSize()}.
        </p>
      </div>
      <SubmitButton data-testid="upload-receipt" disabled={!canSubmit}>
        Upload receipt
      </SubmitButton>
    </form>
  );
}
