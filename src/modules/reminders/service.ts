import {
  addDays,
  differenceInCalendarDays,
  parseISO,
  subDays,
} from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { sendRenewalReminder } from "@/modules/emails/service";
import { createOrGetInvoiceForSubscription } from "@/modules/invoices/service";
import { toDateOnlyString } from "@/modules/subscriptions/status";

export const REMINDER_MILESTONES = [60, 30, 15, 3, 1, -1] as const;

export type ReminderRunResult = {
  processed: number;
  emailsSent: number;
  skipped: number;
  errors: { subscriptionId: string; message: string }[];
};

export function getReminderMilestone(expiryDate: string, now = new Date()) {
  const due = getDueReminderMilestones(expiryDate, now);
  return due[0] ?? null;
}

/**
 * Returns due milestones with the most recently due positive milestone first,
 * so catch-up after downtime sends the current reminder instead of a stale one.
 * After expiry, only the deactivation notice remains due.
 */
export function getDueReminderMilestones(expiryDate: string, now = new Date()) {
  const today = parseISO(toDateOnlyString(now));
  const daysUntilExpiry = differenceInCalendarDays(parseISO(expiryDate), today);

  if (daysUntilExpiry < 0) {
    return REMINDER_MILESTONES.filter(
      (milestone) => milestone < 0 && daysUntilExpiry <= milestone,
    );
  }

  return REMINDER_MILESTONES.filter(
    (milestone) => milestone > 0 && daysUntilExpiry <= milestone,
  ).sort((left, right) => left - right);
}

async function listSentMilestones(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
  periodEnd: string,
) {
  const { data, error } = await supabase
    .from("email_deliveries")
    .select("milestone_days,status")
    .eq("subscription_id", subscriptionId)
    .eq("period_end", periodEnd)
    .in("email_type", ["RENEWAL_REMINDER", "DEACTIVATION_NOTICE"])
    .in("status", [
      "SENT",
      "DELIVERED",
      "OPENED",
      "BOUNCED",
      "COMPLAINED",
      "SUPPRESSED",
    ]);
  if (error) {
    throw new Error(error.message);
  }
  return new Set(
    (data ?? [])
      .map((row) => row.milestone_days)
      .filter((value): value is number => value !== null),
  );
}

export async function runRenewalReminders(
  supabase: SupabaseClient<Database>,
  now = new Date(),
): Promise<ReminderRunResult> {
  const today = parseISO(toDateOnlyString(now));
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "ACTIVE")
    .gte("current_period_end", toDateOnlyString(subDays(today, 1)))
    .lte("current_period_end", toDateOnlyString(addDays(today, 60)));
  if (error) {
    throw new Error(error.message);
  }

  const result: ReminderRunResult = {
    processed: 0,
    emailsSent: 0,
    skipped: 0,
    errors: [],
  };

  for (const subscription of subscriptions) {
    const dueMilestones = getDueReminderMilestones(
      subscription.current_period_end,
      today,
    );
    if (dueMilestones.length === 0) {
      continue;
    }
    result.processed += 1;

    if (subscription.currency !== "SGD") {
      result.skipped += 1;
      result.errors.push({
        subscriptionId: subscription.id,
        message: `Automatic invoicing is not configured for ${subscription.currency}.`,
      });
      continue;
    }

    try {
      const sentMilestones = await listSentMilestones(
        supabase,
        subscription.id,
        subscription.current_period_end,
      );
      const daysUntilExpiry = dueMilestones.find(
        (milestone) => !sentMilestones.has(milestone),
      );
      if (daysUntilExpiry === undefined) {
        result.skipped += 1;
        continue;
      }

      const { invoice, created } = await createOrGetInvoiceForSubscription(
        supabase,
        subscription.id,
      );
      if (created) {
        await supabase.from("audit_logs").insert({
          actor_user_id: null,
          entity_type: "invoice",
          entity_id: invoice.id,
          action: "INVOICE_GENERATED",
          metadata: {
            source: "renewal_cron",
            invoice_number: invoice.invoice_number,
            quotation_number: invoice.quotation_number,
            external_invoice_id: invoice.external_invoice_id,
            external_quotation_id: invoice.external_quotation_id,
          },
        });
      }
      const sent = await sendRenewalReminder(supabase, {
        subscriptionId: subscription.id,
        invoice,
        daysUntilExpiry,
      });
      result.emailsSent += sent;
      if (sent === 0) {
        result.skipped += 1;
      }
    } catch (runError) {
      result.errors.push({
        subscriptionId: subscription.id,
        message:
          runError instanceof Error
            ? runError.message
            : "Reminder processing failed.",
      });
    }
  }

  return result;
}
