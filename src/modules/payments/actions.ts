"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  RECEIPT_BUCKET,
  RECEIPT_MAX_BYTES,
} from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/modules/audit/log";
import { requireAdmin, requireClient } from "@/modules/auth/session";
import { getInvoice, getPayment } from "@/modules/clients/queries";
import { rejectPaymentSchema } from "@/modules/clients/schemas";
import { validateReceiptFile } from "@/modules/payments/receipt-validation";

export type PaymentActionState = { error: string } | null;

export async function submitPaymentReceiptAction(
  invoiceId: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const user = await requireClient();
  const invoice = await getInvoice(invoiceId);
  if (!invoice || invoice.client_id !== user.clientId) {
    return { error: "Invoice not found." };
  }
  if (invoice.status !== "SENT") {
    return { error: "This invoice is not awaiting payment." };
  }

  const file = formData.get("receipt");
  if (!(file instanceof File)) {
    return { error: "Choose a receipt to upload." };
  }

  const validationError = validateReceiptFile(file);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .in("status", ["PENDING", "PENDING_VERIFICATION", "REJECTED"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  const paymentId = existing?.id;
  let id = paymentId;

  if (!id) {
    const { data: created, error } = await supabase
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        client_id: invoice.client_id,
        payment_method: "BANK_TRANSFER",
        amount: invoice.total,
        currency: invoice.currency,
        status: "PENDING_VERIFICATION",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !created) {
      return { error: error?.message ?? "Could not create payment." };
    }
    id = created.id;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${invoice.client_id}/${invoiceId}/${id}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: "PENDING_VERIFICATION",
      receipt_file_url: path,
      submitted_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id);

  if (updateError) {
    return { error: updateError.message };
  }

  await writeAuditLog({
    actorUserId: user.id,
    entityType: "payment",
    entityId: id,
    action: "PAYMENT_SUBMITTED",
    metadata: { invoice_id: invoiceId },
  });

  revalidatePath("/portal");
  revalidatePath(`/portal/invoices/${invoiceId}`);
  redirect(`/portal/invoices/${invoiceId}`);
}

export async function confirmPaymentAction(paymentId: string) {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("confirm_bank_transfer_payment", {
    p_payment_id: paymentId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${paymentId}`);
  redirect(`/admin/payments/${paymentId}`);
}

export async function rejectPaymentAction(
  paymentId: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  await requireAdmin();
  const parsed = rejectPaymentSchema.safeParse({
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const payment = await getPayment(paymentId);
  if (!payment) {
    return { error: "Payment not found." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("reject_bank_transfer_payment", {
    p_payment_id: paymentId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${paymentId}`);
  redirect(`/admin/payments/${paymentId}`);
}

export async function createReceiptSignedUrl(path: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(path, 60);

  if (error || !data) {
    return null;
  }
  return data.signedUrl;
}
