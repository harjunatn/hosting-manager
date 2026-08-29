import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuditAction =
  | "CLIENT_CREATED"
  | "SUBSCRIPTION_CREATED"
  | "INVOICE_GENERATED"
  | "INVOICE_SENT"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_REJECTED"
  | "PAYMENT_CONFIRMED"
  | "SUBSCRIPTION_RENEWED";

export async function writeAuditLog(input: {
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("Failed to write audit log", error);
  }
}
