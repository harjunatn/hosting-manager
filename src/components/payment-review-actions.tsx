"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmPaymentAction,
  rejectPaymentAction,
  type PaymentActionState,
} from "@/modules/payments/actions";

export function PaymentReviewActions({ paymentId }: { paymentId: string }) {
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [rejectState, rejectAction] = useActionState<PaymentActionState, FormData>(
    rejectPaymentAction.bind(null, paymentId),
    null,
  );
  const rejectFormId = `reject-payment-${paymentId}`;

  return (
    <div className="max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      {confirmError ? (
        <Alert variant="destructive">
          <AlertDescription>{confirmError}</AlertDescription>
        </Alert>
      ) : null}
      {rejectState?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{rejectState.error}</AlertDescription>
        </Alert>
      ) : null}
      <form id={rejectFormId} action={rejectAction} className="space-y-1.5">
        <Label htmlFor="reason">Rejection reason</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={3}
          placeholder="Required when rejecting a payment"
          data-testid="reject-reason"
        />
        <p className="text-xs text-muted-foreground">
          Only required if you reject this payment.
        </p>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <form
          action={async () => {
            const result = await confirmPaymentAction(paymentId);
            if (result?.error) {
              setConfirmError(result.error);
            }
          }}
        >
          <Button type="submit" data-testid="confirm-payment">
            Confirm payment
          </Button>
        </form>
        <SubmitButton
          form={rejectFormId}
          variant="destructive"
          data-testid="reject-payment"
        >
          Reject payment
        </SubmitButton>
      </div>
    </div>
  );
}
