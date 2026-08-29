"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/modules/audit/log";
import { requireAdmin } from "@/modules/auth/session";
import {
  clientSchema,
  contactSchema,
  emptyToNull,
  hostingSchema,
  subscriptionSchema,
  checkboxValue,
} from "@/modules/clients/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { yearlyExpiryFromStart } from "@/modules/subscriptions/status";

export type ActionState = { error: string } | null;

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = clientSchema.safeParse({
    business_name: formData.get("business_name"),
    billing_name: formData.get("billing_name"),
    billing_address: String(formData.get("billing_address") ?? ""),
    country: String(formData.get("country") ?? ""),
    default_currency: formData.get("default_currency"),
    status: formData.get("status"),
    remarks: String(formData.get("remarks") ?? ""),
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      business_name: parsed.data.business_name,
      billing_name: parsed.data.billing_name,
      billing_address: emptyToNull(parsed.data.billing_address),
      country: emptyToNull(parsed.data.country),
      default_currency: parsed.data.default_currency,
      status: parsed.data.status,
      remarks: emptyToNull(parsed.data.remarks),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create client." };
  }

  await writeAuditLog({
    actorUserId: admin.id,
    entityType: "client",
    entityId: data.id,
    action: "CLIENT_CREATED",
  });

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${data.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = clientSchema.safeParse({
    business_name: formData.get("business_name"),
    billing_name: formData.get("billing_name"),
    billing_address: String(formData.get("billing_address") ?? ""),
    country: String(formData.get("country") ?? ""),
    default_currency: formData.get("default_currency"),
    status: formData.get("status"),
    remarks: String(formData.get("remarks") ?? ""),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({
      business_name: parsed.data.business_name,
      billing_name: parsed.data.billing_name,
      billing_address: emptyToNull(parsed.data.billing_address),
      country: emptyToNull(parsed.data.country),
      default_currency: parsed.data.default_currency,
      status: parsed.data.status,
      remarks: emptyToNull(parsed.data.remarks),
    })
    .eq("id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}`);
}

export async function createContactAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? ""),
    is_primary: checkboxValue(formData, "is_primary"),
    receive_invoice: checkboxValue(formData, "receive_invoice"),
    receive_reminder: checkboxValue(formData, "receive_reminder"),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("client_contacts").insert({
    client_id: clientId,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: emptyToNull(parsed.data.phone),
    is_primary: parsed.data.is_primary,
    receive_invoice: parsed.data.receive_invoice,
    receive_reminder: parsed.data.receive_reminder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/clients/${clientId}/contacts`);
  redirect(`/admin/clients/${clientId}/contacts`);
}

export async function createHostingAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = hostingSchema.safeParse({
    name: formData.get("name"),
    hosting_type: formData.get("hosting_type"),
    project_url: String(formData.get("project_url") ?? ""),
    status: formData.get("status"),
    remarks: String(formData.get("remarks") ?? ""),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("hosting_services").insert({
    client_id: clientId,
    name: parsed.data.name,
    hosting_type: parsed.data.hosting_type,
    project_url: emptyToNull(parsed.data.project_url),
    status: parsed.data.status,
    remarks: emptyToNull(parsed.data.remarks),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/clients/${clientId}/hosting`);
  redirect(`/admin/clients/${clientId}/hosting`);
}

export async function updateHostingAction(
  clientId: string,
  hostingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = hostingSchema.safeParse({
    name: formData.get("name"),
    hosting_type: formData.get("hosting_type"),
    project_url: String(formData.get("project_url") ?? ""),
    status: formData.get("status"),
    remarks: String(formData.get("remarks") ?? ""),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("hosting_services")
    .select("id, client_id")
    .eq("id", hostingId)
    .maybeSingle();

  if (existingError || !existing || existing.client_id !== clientId) {
    return { error: "Hosting service not found." };
  }

  const { error } = await supabase
    .from("hosting_services")
    .update({
      name: parsed.data.name,
      hosting_type: parsed.data.hosting_type,
      project_url: emptyToNull(parsed.data.project_url),
      status: parsed.data.status,
      remarks: emptyToNull(parsed.data.remarks),
    })
    .eq("id", hostingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/clients/${clientId}/hosting`);
  redirect(`/admin/clients/${clientId}/hosting`);
}

export async function createSubscriptionAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = subscriptionSchema.safeParse({
    hosting_service_id: String(formData.get("hosting_service_id") ?? ""),
    quantity: formData.get("quantity"),
    unit_price: formData.get("unit_price"),
    currency: formData.get("currency"),
    start_date: String(formData.get("start_date") ?? ""),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { data: hostingService, error: hostingError } = await supabase
    .from("hosting_services")
    .select("id, client_id")
    .eq("id", parsed.data.hosting_service_id)
    .maybeSingle();

  if (hostingError || !hostingService || hostingService.client_id !== clientId) {
    return { error: "Select a hosting service for this client." };
  }

  const { data: existingSubscription, error: existingError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("hosting_service_id", parsed.data.hosting_service_id)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existingSubscription) {
    return {
      error:
        "This hosting service already has a subscription. Generate an invoice to renew it instead of creating a new one.",
    };
  }

  const expiry = yearlyExpiryFromStart(parsed.data.start_date);
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      client_id: clientId,
      hosting_service_id: parsed.data.hosting_service_id,
      billing_interval: "YEARLY",
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unit_price,
      currency: parsed.data.currency,
      start_date: parsed.data.start_date,
      current_period_start: parsed.data.start_date,
      current_period_end: expiry,
      status: "ACTIVE",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create subscription." };
  }

  await writeAuditLog({
    actorUserId: admin.id,
    entityType: "subscription",
    entityId: data.id,
    action: "SUBSCRIPTION_CREATED",
  });

  revalidatePath(`/admin/clients/${clientId}/subscriptions`);
  redirect(`/admin/clients/${clientId}/subscriptions`);
}
