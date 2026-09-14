import { describe, expect, it } from "vitest";

import {
  getDueReminderMilestones,
  getReminderMilestone,
  REMINDER_MILESTONES,
} from "@/modules/reminders/service";

describe("renewal reminder milestones", () => {
  const today = new Date("2026-09-10T00:00:00.000Z");

  it.each([
    ["2026-11-09", 60],
    ["2026-10-10", 30],
    ["2026-09-25", 15],
    ["2026-09-13", 3],
    ["2026-09-11", 1],
    ["2026-09-09", -1],
  ])("matches %s to milestone %i", (expiry, milestone) => {
    expect(getReminderMilestone(expiry, today)).toBe(milestone);
  });

  it("catches up to the most recently due positive milestone", () => {
    // 28 days left: H-60 and H-30 are past due; prefer H-30 over a stale H-60.
    expect(getReminderMilestone("2026-10-08", today)).toBe(30);
    expect(getDueReminderMilestones("2026-10-08", today)).toEqual([30, 60]);
  });

  it("does not requeue positive reminders after expiry", () => {
    expect(getDueReminderMilestones("2026-09-09", today)).toEqual([-1]);
  });

  it("catches up when the exact milestone day was missed", () => {
    // 10 days left: H-15 has passed, so catch-up selects H-15.
    expect(getReminderMilestone("2026-09-20", today)).toBe(15);
    expect(getDueReminderMilestones("2026-09-20", today)).toEqual([
      15, 30, 60,
    ]);
  });

  it("returns null more than 60 days before expiry", () => {
    expect(getReminderMilestone("2026-12-01", today)).toBeNull();
    expect(getDueReminderMilestones("2026-12-01", today)).toEqual([]);
  });

  it("keeps the agreed schedule explicit", () => {
    expect(REMINDER_MILESTONES).toEqual([60, 30, 15, 3, 1, -1]);
  });
});
