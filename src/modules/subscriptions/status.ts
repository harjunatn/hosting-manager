import {
  addDays,
  addYears,
  differenceInCalendarDays,
  differenceInYears,
  parseISO,
  subDays,
} from "date-fns";

import { EXPIRING_WITHIN_DAYS } from "@/lib/constants";
import type {
  Invoice,
  InvoiceStatus,
  Subscription,
} from "@/lib/supabase/database.types";

export type EffectiveSubscriptionStatus =
  | "ACTIVE"
  | "EXPIRING"
  | "PAYMENT_DUE"
  | "EXPIRED"
  | "CANCELLED";

export type EffectiveInvoiceStatus = InvoiceStatus | "OVERDUE";

export function parseDateOnly(value: string) {
  return parseISO(value);
}

export function getEffectiveSubscriptionStatus(
  subscription: Pick<Subscription, "status" | "current_period_end">,
  now: Date,
  hasUnpaidSentInvoice: boolean,
): EffectiveSubscriptionStatus {
  if (subscription.status === "CANCELLED") {
    return "CANCELLED";
  }

  const expiry = parseDateOnly(subscription.current_period_end);
  const daysUntilExpiry = differenceInCalendarDays(expiry, now);

  if (daysUntilExpiry < 0) {
    return "EXPIRED";
  }

  if (hasUnpaidSentInvoice) {
    return "PAYMENT_DUE";
  }

  if (daysUntilExpiry <= EXPIRING_WITHIN_DAYS) {
    return "EXPIRING";
  }

  return "ACTIVE";
}

export function getEffectiveInvoiceStatus(
  invoice: Pick<Invoice, "status" | "due_date">,
  now: Date,
): EffectiveInvoiceStatus {
  if (invoice.status === "SENT") {
    const due = parseDateOnly(invoice.due_date);
    if (differenceInCalendarDays(due, now) < 0) {
      return "OVERDUE";
    }
  }
  return invoice.status;
}

export function calculateNextPeriod(currentPeriodEnd: Date) {
  return {
    currentPeriodStart: addDays(currentPeriodEnd, 1),
    currentPeriodEnd: addYears(currentPeriodEnd, 1),
  };
}

export function yearlyExpiryFromStart(startDate: string) {
  return toDateOnlyString(subDays(addYears(parseISO(startDate), 1), 1));
}

/** Paid renewals after the first year, matching spreadsheet "Renewal Cycle Paid". */
export function paidRenewalCount(startDate: string, currentPeriodEnd: string) {
  const initialExpiry = parseISO(yearlyExpiryFromStart(startDate));
  const currentExpiry = parseISO(currentPeriodEnd);
  return Math.max(0, differenceInYears(currentExpiry, initialExpiry));
}

export function toDateOnlyString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
