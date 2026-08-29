import { calculateNextPeriod } from "@/modules/subscriptions/status";

export function renewFromExpiry(currentPeriodEnd: Date) {
  return calculateNextPeriod(currentPeriodEnd);
}
