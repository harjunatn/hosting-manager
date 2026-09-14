import { describe, expect, it } from "vitest";

import {
  invoiceEmailAttachments,
  webhookStatusUpdate,
} from "@/modules/emails/service";

describe("invoiceEmailAttachments", () => {
  const invoicePdf = {
    filename: "TRM-006190.pdf",
    content: Buffer.from("%PDF-invoice"),
    contentType: "application/pdf",
  };
  const quotationPdf = {
    filename: "EST-00042.pdf",
    content: Buffer.from("%PDF-quotation"),
    contentType: "application/pdf",
  };

  it("includes quotation and invoice PDFs for the initial send", () => {
    expect(invoiceEmailAttachments(invoicePdf, quotationPdf)).toEqual([
      quotationPdf,
      invoicePdf,
    ]);
  });

  it("falls back to the invoice PDF alone for reminders or legacy rows", () => {
    expect(invoiceEmailAttachments(invoicePdf, null)).toEqual([invoicePdf]);
  });
});

describe("webhookStatusUpdate", () => {
  it("records delivered and opened timestamps", () => {
    expect(
      webhookStatusUpdate("email.delivered", "2026-09-10T08:00:00.000Z", {}),
    ).toMatchObject({
      status: "DELIVERED",
      delivered_at: "2026-09-10T08:00:00.000Z",
    });
    expect(
      webhookStatusUpdate("email.opened", "2026-09-10T08:01:00.000Z", {}),
    ).toMatchObject({
      status: "OPENED",
      opened_at: "2026-09-10T08:01:00.000Z",
    });
  });

  it("stores the bounce reason", () => {
    expect(
      webhookStatusUpdate("email.bounced", "2026-09-10T08:00:00.000Z", {
        bounce: { message: "Mailbox unavailable" },
      }),
    ).toMatchObject({
      status: "BOUNCED",
      error_message: "Mailbox unavailable",
    });
  });

  it("ignores unrelated events", () => {
    expect(
      webhookStatusUpdate("domain.updated", "2026-09-10T08:00:00.000Z", {}),
    ).toBeNull();
  });
});
