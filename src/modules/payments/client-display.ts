import type { Payment } from "@/lib/supabase/database.types";

export function getLatestPaymentForInvoice(
  payments: Payment[],
  invoiceId: string,
) {
  return payments.find((payment) => payment.invoice_id === invoiceId) ?? null;
}

export function getClientPaymentNote(payment: Payment | null) {
  if (!payment) {
    return null;
  }
  if (payment.status === "REJECTED") {
    return {
      label: "Receipt rejected",
      className: "text-rose-700",
    };
  }
  if (payment.status === "PENDING_VERIFICATION") {
    return {
      label: "Awaiting verification",
      className: "text-muted-foreground",
    };
  }
  return null;
}
