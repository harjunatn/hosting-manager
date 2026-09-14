import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { runRenewalReminders } from "@/modules/reminders/service";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (process.env.RESEND_ENABLED !== "true") {
    return Response.json(
      { error: "Resend is not enabled." },
      { status: 503 },
    );
  }

  try {
    const result = await runRenewalReminders(
      createServiceRoleSupabaseClient(),
    );
    return Response.json(result, {
      status: result.errors.length > 0 ? 207 : 200,
    });
  } catch (error) {
    console.error("Renewal reminder cron failed", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Reminder cron failed.",
      },
      { status: 500 },
    );
  }
}
