export function canConfirmPayment(input: {
  paymentStatus: string;
  invoiceStatus: string;
}) {
  return (
    input.paymentStatus === "PENDING_VERIFICATION" &&
    input.invoiceStatus !== "PAID" &&
    input.invoiceStatus !== "VOID"
  );
}
