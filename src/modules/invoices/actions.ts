"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { INVOICE_DUE_DAYS } from "@/lib/constants";
import { lineAmount } from "@/lib/money";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getInvoiceProvider } from "@/integrations/invoice/get-invoice-provider";
import { writeAuditLog } from "@/modules/audit/log";
import { requireAdmin } from "@/modules/auth/session";
import { getHosting, getInvoice, getSubscription } from "@/modules/clients/queries";
import { toDateOnlyString } from "@/modules/subscriptions/status";

export type InvoiceActionState = { error: string } | null;

export async function generateInvoiceAction(
  subscriptionId: string,
): Promise<InvoiceActionState> {
  const admin = await requireAdmin();
  const subscription = await getSubscription(subscriptionId);
  if (!subscription) {
    return { error: "Subscription not found." };
  }

  const hosting = await getHosting(subscription.hosting_service_id);
  if (!hosting) {
    return { error: "Hosting service not found." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("business_name")
    .eq("id", subscription.client_id)
    .single();

  if (clientError || !client) {
    return { error: "Client not found." };
  }

  const amount = lineAmount(subscription.quantity, subscription.unit_price);
  const description = `Annual ${hosting.hosting_type} Hosting`;
  const providerResult = await getInvoiceProvider(subscription.currency).createInvoice({
    currency: subscription.currency,
    clientName: client.business_name,
    description,
    quantity: subscription.quantity,
    unitPrice: subscription.unit_price,
  });

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "allocate_invoice_number",
  );

  if (numberError || !invoiceNumber) {
    return { error: numberError?.message ?? "Could not allocate invoice number." };
  }

  const issueDate = toDateOnlyString(new Date());
  const dueDate = toDateOnlyString(addDays(new Date(), INVOICE_DUE_DAYS));

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id: subscription.client_id,
      subscription_id: subscription.id,
      invoice_number: invoiceNumber,
      provider: providerResult.provider,
      external_invoice_id: providerResult.externalInvoiceId,
      issue_date: issueDate,
      due_date: dueDate,
      currency: subscription.currency,
      subtotal: amount,
      total: amount,
      status: "DRAFT",
    })
    .select("id")
    .single();

  if (error || !invoice) {
    return { error: error?.message ?? "Could not create invoice." };
  }

  const { error: itemError } = await supabase.from("invoice_items").insert({
    invoice_id: invoice.id,
    description,
    quantity: subscription.quantity,
    unit_price: subscription.unit_price,
    amount,
  });

  if (itemError) {
    return { error: itemError.message };
  }

  await writeAuditLog({
    actorUserId: admin.id,
    entityType: "invoice",
    entityId: invoice.id,
    action: "INVOICE_GENERATED",
    metadata: { invoice_number: invoiceNumber },
  });

  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function sendInvoiceAction(invoiceId: string) {
  const admin = await requireAdmin();
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    return { error: "Invoice not found." };
  }
  if (invoice.status !== "DRAFT") {
    return { error: "Only draft invoices can be sent." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "SENT" })
    .eq("id", invoiceId);

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    actorUserId: admin.id,
    entityType: "invoice",
    entityId: invoiceId,
    action: "INVOICE_SENT",
  });

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoiceId}`);
}
