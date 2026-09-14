import { getResendEmailProvider } from "@/integrations/email/resend-email-provider";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { webhookStatusUpdate } from "@/modules/emails/service";

export async function POST(request: Request) {
  const provider = getResendEmailProvider();
  if (!provider) {
    return Response.json({ error: "Resend is not configured." }, { status: 503 });
  }

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return Response.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  let event;
  try {
    event = provider.verifyWebhook({
      payload: await request.text(),
      id,
      timestamp,
      signature,
    });
  } catch {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const data = event.data as unknown as Record<string, unknown>;
  const providerMessageId = data.email_id;
  if (typeof providerMessageId !== "string") {
    return Response.json({ received: true });
  }
  const eventAt = event.created_at;
  const update = webhookStatusUpdate(event.type, eventAt, data);
  if (!update) {
    return Response.json({ received: true });
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data: delivery, error: deliveryError } = await supabase
    .from("email_deliveries")
    .select("id, event_at")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (deliveryError) {
    return Response.json({ error: deliveryError.message }, { status: 500 });
  }
  if (!delivery) {
    return Response.json({ received: true });
  }
  if (
    delivery.event_at &&
    new Date(delivery.event_at).getTime() > new Date(eventAt).getTime()
  ) {
    return Response.json({ received: true });
  }

  const { error } = await supabase
    .from("email_deliveries")
    .update(update)
    .eq("id", delivery.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ received: true });
}
