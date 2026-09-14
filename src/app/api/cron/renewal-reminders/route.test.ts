import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}));

vi.mock("@/modules/reminders/service", () => ({
  runRenewalReminders: vi.fn(async () => ({
    processed: 0,
    emailsSent: 0,
    skipped: 0,
    errors: [],
  })),
}));

describe("renewal reminders cron route", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("rejects missing or invalid authorization", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("RESEND_ENABLED", "true");
    const { GET } = await import("@/app/api/cron/renewal-reminders/route");

    const unauthorized = await GET(new Request("http://localhost/api/cron"));
    expect(unauthorized.status).toBe(401);

    const wrongSecret = await GET(
      new Request("http://localhost/api/cron", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(wrongSecret.status).toBe(401);
  });

  it("requires Resend to be enabled", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("RESEND_ENABLED", "false");
    const { GET } = await import("@/app/api/cron/renewal-reminders/route");

    const response = await GET(
      new Request("http://localhost/api/cron", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(response.status).toBe(503);
  });

  it("runs reminders when authorized", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("RESEND_ENABLED", "true");
    const { GET } = await import("@/app/api/cron/renewal-reminders/route");

    const response = await GET(
      new Request("http://localhost/api/cron", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      processed: 0,
      emailsSent: 0,
    });
  });
});
