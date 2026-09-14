import { describe, expect, it } from "vitest";

import {
  buildInvoiceEmail,
  buildRenewalReminderEmail,
} from "@/modules/emails/templates";

const details = {
  contactName: "Finance <Team>",
  clientName: "Example & Co",
  projectUrl: "https://example.com/tour?a=1&b=2",
  expiryDate: "2026-10-31",
  amount: "150.00",
  currency: "SGD" as const,
  invoiceNumber: "TRM-006190",
  daysUntilExpiry: 15,
};

describe("email templates", () => {
  it("builds and escapes an invoice email", () => {
    const email = buildInvoiceEmail(details);

    expect(email.subject).toContain("quotation and invoice");
    expect(email.subject).toContain("TRM-006190");
    expect(email.html).toContain("Finance &lt;Team&gt;");
    expect(email.html).toContain("Example &amp; Co");
    expect(email.text).toContain("quotation and invoice");
    expect(email.text).toContain("SGD");
  });

  it("builds the post-expiry notice", () => {
    const email = buildRenewalReminderEmail({
      ...details,
      daysUntilExpiry: -1,
    });

    expect(email.subject).toContain("expired");
    expect(email.text).toContain("may be deactivated");
  });
});
