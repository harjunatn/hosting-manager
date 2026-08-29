import { addDays, differenceInCalendarDays } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  getEffectiveInvoiceStatus,
  getEffectiveSubscriptionStatus,
} from "@/modules/subscriptions/status";

describe("getEffectiveSubscriptionStatus", () => {
  const base = {
    status: "ACTIVE" as const,
    current_period_end: "2026-08-31",
  };

  it("returns EXPIRED after the period end", () => {
    expect(
      getEffectiveSubscriptionStatus(base, new Date("2026-09-01"), false),
    ).toBe("EXPIRED");
  });

  it("returns EXPIRING within 30 days", () => {
    expect(
      getEffectiveSubscriptionStatus(base, new Date("2026-08-10"), false),
    ).toBe("EXPIRING");
  });

  it("returns PAYMENT_DUE when a sent invoice is unpaid", () => {
    expect(
      getEffectiveSubscriptionStatus(base, new Date("2026-07-01"), true),
    ).toBe("PAYMENT_DUE");
  });

  it("returns CANCELLED regardless of dates", () => {
    expect(
      getEffectiveSubscriptionStatus(
        { ...base, status: "CANCELLED" },
        new Date("2026-07-01"),
        true,
      ),
    ).toBe("CANCELLED");
  });

  it("returns ACTIVE when plenty of time remains", () => {
    expect(
      getEffectiveSubscriptionStatus(base, new Date("2026-01-01"), false),
    ).toBe("ACTIVE");
  });
});

describe("getEffectiveInvoiceStatus", () => {
  it("marks SENT invoices OVERDUE after the due date", () => {
    expect(
      getEffectiveInvoiceStatus(
        { status: "SENT", due_date: "2026-01-01" },
        new Date("2026-01-02"),
      ),
    ).toBe("OVERDUE");
  });

  it("keeps SENT before the due date", () => {
    expect(
      getEffectiveInvoiceStatus(
        { status: "SENT", due_date: "2026-01-15" },
        new Date("2026-01-01"),
      ),
    ).toBe("SENT");
  });
});

describe("due window helper", () => {
  it("uses a 14-day gap from issue to due", () => {
    const issue = new Date("2026-08-01T00:00:00.000Z");
    const due = addDays(issue, 14);
    expect(differenceInCalendarDays(due, issue)).toBe(14);
  });
});
