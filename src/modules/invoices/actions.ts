"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getZohoBooksInvoiceProvider } from "@/integrations/invoice/get-invoice-provider";
import { writeAuditLog } from "@/modules/audit/log";
import { requireAdmin } from "@/modules/auth/session";
import {
  getInvoice,
  getSubscription,
} from "@/modules/clients/queries";
import { sendInvoiceEmail } from "@/modules/emails/service";
import { createOrGetInvoiceForSubscription } from "@/modules/invoices/service";

export type InvoiceActionState = { error: string } | null;

export async function generateInvoiceAction(
  subscriptionId: string,
): Promise<InvoiceActionState> {
  const admin = await requireAdmin();
  const subscription = await getSubscription(subscriptionId);
  if (!subscription) {
    return { error: "Subscription not found." };
  }
  if (subscription.currency !== "SGD" || !getZohoBooksInvoiceProvider()) {
    return {
      error:
        "Quotation and invoice delivery requires Zoho Books for an SGD subscription.",
    };
  }

  const supabase = await createServerSupabaseClient();
  let result;
  try {
    result = await createOrGetInvoiceForSubscription(supabase, subscriptionId);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create the external invoice.",
    };
  }

  if (result.created) {
    await writeAuditLog({
      actorUserId: admin.id,
      entityType: "invoice",
      entityId: result.invoice.id,
      action: "INVOICE_GENERATED",
      metadata: {
        invoice_number: result.invoice.invoice_number,
        quotation_number: result.invoice.quotation_number,
        provider: result.invoice.provider,
        external_invoice_id: result.invoice.external_invoice_id,
        external_quotation_id: result.invoice.external_quotation_id,
      },
    });
  }
  if (result.invoice.status !== "DRAFT") {
    return { error: "These billing documents have already been sent." };
  }

  let sentCount: number;
  try {
    sentCount = await sendInvoiceEmail(supabase, result.invoice);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not send the billing documents.",
    };
  }

  await writeAuditLog({
    actorUserId: admin.id,
    entityType: "invoice",
    entityId: result.invoice.id,
    action: "INVOICE_SENT",
    metadata: {
      recipient_count: sentCount,
      quotation_number: result.invoice.quotation_number,
      invoice_number: result.invoice.invoice_number,
    },
  });

  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${result.invoice.id}`);
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
  let sentCount: number;
  try {
    sentCount = await sendInvoiceEmail(supabase, invoice);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not send the invoice.",
    };
  }

  await writeAuditLog({
    actorUserId: admin.id,
    entityType: "invoice",
    entityId: invoiceId,
    action: "INVOICE_SENT",
    metadata: {
      recipient_count: sentCount,
      quotation_number: invoice.quotation_number,
      invoice_number: invoice.invoice_number,
    },
  });

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoiceId}`);
}
