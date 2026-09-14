import { describe, expect, it } from "vitest";

import { getResendEmailConfig } from "@/integrations/email/resend-email-provider";

describe("getResendEmailConfig", () => {
  it("keeps email disabled unless explicitly enabled", () => {
    expect(getResendEmailConfig({})).toBeNull();
  });

  it("requires a test recipient in test mode", () => {
    expect(() =>
      getResendEmailConfig({
        RESEND_ENABLED: "true",
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "Sender <onboarding@resend.dev>",
        EMAIL_DELIVERY_MODE: "test",
      }),
    ).toThrow("EMAIL_TEST_RECIPIENT is required");
  });

  it("does not redirect recipients in live mode", () => {
    expect(
      getResendEmailConfig({
        RESEND_ENABLED: "true",
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "billing@example.com",
        EMAIL_DELIVERY_MODE: "live",
      }),
    ).toMatchObject({
      deliveryMode: "live",
      testRecipient: undefined,
    });
  });
});
