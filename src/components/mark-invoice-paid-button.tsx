"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { markInvoicePaidAction } from "@/modules/payments/actions";

export function MarkInvoicePaidButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setError(null);
          }
        }}
      >
        <AlertDialogTrigger
          render={
            <Button
              size="sm"
              data-testid="mark-invoice-paid"
            />
          }
        >
          Mark as paid
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm payment</AlertDialogTitle>
            <AlertDialogDescription>
              Mark invoice <strong>{invoiceNumber}</strong> as paid? This will
              record the bank transfer in Zoho Books and renew the
              subscription period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form
              action={async () => {
                setError(null);
                const result = await markInvoicePaidAction(invoiceId);
                if (result?.error) {
                  setError(result.error);
                } else {
                  setOpen(false);
                }
              }}
            >
              <SubmitButton data-testid="confirm-mark-invoice-paid">
                Confirm payment
              </SubmitButton>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && !open ? (
        <p className="max-w-64 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
