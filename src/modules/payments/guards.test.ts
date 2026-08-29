import { describe, expect, it } from "vitest";

import { canConfirmPayment } from "@/modules/payments/guards";

describe("canConfirmPayment", () => {
  it("allows confirming a pending verification payment on an unpaid invoice", () => {
    expect(
      canConfirmPayment({
        paymentStatus: "PENDING_VERIFICATION",
        invoiceStatus: "SENT",
      }),
    ).toBe(true);
  });

  it("prevents renewing the same invoice twice", () => {
    expect(
      canConfirmPayment({
        paymentStatus: "PENDING_VERIFICATION",
        invoiceStatus: "PAID",
      }),
    ).toBe(false);
  });
});
