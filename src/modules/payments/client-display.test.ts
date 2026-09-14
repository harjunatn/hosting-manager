import { describe, expect, it } from "vitest";

import {
  getClientPaymentNote,
  getLatestPaymentForInvoice,
} from "@/modules/payments/client-display";
import type { Payment } from "@/lib/supabase/database.types";

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: "pay-1",
    invoice_id: "inv-1",
    client_id: "client-1",
    payment_method: "BANK_TRANSFER",
    payment_source: "CLIENT_RECEIPT",
    amount: "250.00",
    currency: "SGD",
    status: "PENDING_VERIFICATION",
    external_payment_id: null,
    receipt_file_url: null,
    submitted_at: null,
    verified_at: null,
    verified_by: null,
    rejection_reason: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getLatestPaymentForInvoice", () => {
  it("returns the newest payment for an invoice", () => {
    const payments = [
      payment({ id: "pay-new", invoice_id: "inv-1", status: "REJECTED" }),
      payment({ id: "pay-old", invoice_id: "inv-2" }),
    ];

    expect(getLatestPaymentForInvoice(payments, "inv-1")?.id).toBe("pay-new");
  });
});

describe("getClientPaymentNote", () => {
  it("shows a rejection note for rejected payments", () => {
    expect(getClientPaymentNote(payment({ status: "REJECTED" }))).toEqual({
      label: "Receipt rejected",
      className: "text-rose-700",
    });
  });

  it("shows a pending note while verification is in progress", () => {
    expect(
      getClientPaymentNote(payment({ status: "PENDING_VERIFICATION" })),
    ).toEqual({
      label: "Awaiting verification",
      className: "text-muted-foreground",
    });
  });
});
