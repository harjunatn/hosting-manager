import { addDays, addYears } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  calculateNextPeriod,
  paidRenewalCount,
  yearlyExpiryFromStart,
} from "@/modules/subscriptions/status";
import { lineAmount } from "@/lib/money";

describe("calculateNextPeriod", () => {
  it("extends expiry by one calendar year from the existing end date", () => {
    const currentEnd = new Date("2026-08-31T00:00:00.000Z");
    const next = calculateNextPeriod(currentEnd);

    expect(next.currentPeriodStart.toISOString().slice(0, 10)).toBe(
      "2026-09-01",
    );
    expect(next.currentPeriodEnd.toISOString().slice(0, 10)).toBe(
      "2027-08-31",
    );
  });

  it("ignores the payment date — only the current expiry matters", () => {
    const currentEnd = new Date("2026-08-31T00:00:00.000Z");
    const paidOn = new Date("2026-09-10T00:00:00.000Z");
    const next = calculateNextPeriod(currentEnd);

    expect(next.currentPeriodEnd.toISOString().slice(0, 10)).toBe(
      "2027-08-31",
    );
    expect(addYears(paidOn, 1).toISOString().slice(0, 10)).not.toBe(
      next.currentPeriodEnd.toISOString().slice(0, 10),
    );
  });

  it("keeps the same calendar day when adding a year", () => {
    const currentEnd = new Date("2025-12-31T00:00:00.000Z");
    const next = calculateNextPeriod(currentEnd);
    expect(next.currentPeriodEnd.toISOString().slice(0, 10)).toBe(
      "2026-12-31",
    );
    expect(addDays(currentEnd, 1).toISOString().slice(0, 10)).toBe(
      next.currentPeriodStart.toISOString().slice(0, 10),
    );
  });
});

describe("yearlyExpiryFromStart", () => {
  it("sets expiry to one year minus one day from start", () => {
    expect(yearlyExpiryFromStart("2023-09-01")).toBe("2024-08-31");
    expect(yearlyExpiryFromStart("2026-01-01")).toBe("2026-12-31");
  });
});

describe("paidRenewalCount", () => {
  it("is 0 on a newly created yearly subscription", () => {
    expect(paidRenewalCount("2026-01-01", "2026-12-31")).toBe(0);
    expect(paidRenewalCount("2023-09-01", "2024-08-31")).toBe(0);
  });

  it("counts full years beyond the first expiry", () => {
    expect(paidRenewalCount("2023-09-01", "2026-08-31")).toBe(2);
    expect(paidRenewalCount("2023-10-01", "2026-09-30")).toBe(2);
    expect(paidRenewalCount("2023-09-01", "2025-08-31")).toBe(1);
  });

  it("does not go negative if expiry is still the first year", () => {
    expect(paidRenewalCount("2025-01-01", "2025-12-31")).toBe(0);
  });
});

describe("lineAmount", () => {
  it("multiplies quantity and unit price without floating-point totals", () => {
    expect(lineAmount(1, "250.00")).toBe("250.00");
    expect(lineAmount(2, "150.50")).toBe("301.00");
  });
});
