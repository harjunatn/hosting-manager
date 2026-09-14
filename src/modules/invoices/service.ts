import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getInvoiceProvider } from "@/integrations/invoice/get-invoice-provider";
import type { CreateQuotationAndInvoiceResult } from "@/integrations/invoice/invoice-provider";
import { lineAmount } from "@/lib/money";
import type {
  Database,
  Invoice,
} from "@/lib/supabase/database.types";
import {
  calculateNextPeriod,
  parseDateOnly,
  toDateOnlyString,
} from "@/modules/subscriptions/status";

export type InvoiceCreationResult = {
  invoice: Invoice;
  created: boolean;
};

function isQuotationAndInvoiceResult(
  result: { externalInvoiceId: string } & Record<string, unknown>,
): result is CreateQuotationAndInvoiceResult {
  return (
    typeof result.externalQuotationId === "string" &&
    typeof result.quotationNumber === "string"
  );
}

async function findExistingInvoice(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
  periodEnd: string,
) {
  const { data: periodInvoice, error: periodInvoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .eq("billing_period_end", periodEnd)
    .neq("status", "VOID")
    .maybeSingle();
  if (periodInvoiceError) {
    throw new Error(periodInvoiceError.message);
  }
  if (periodInvoice) {
    return periodInvoice;
  }

  const { data: legacyOpenInvoice, error: legacyInvoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .is("billing_period_end", null)
    .in("status", ["DRAFT", "SENT"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (legacyInvoiceError) {
    throw new Error(legacyInvoiceError.message);
  }
  return legacyOpenInvoice;
}

export async function createOrGetInvoiceForSubscription(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
): Promise<InvoiceCreationResult> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();
  if (subscriptionError || !subscription) {
    throw new Error(subscriptionError?.message ?? "Subscription not found.");
  }

  const existing = await findExistingInvoice(
    supabase,
    subscription.id,
    subscription.current_period_end,
  );
  if (existing) {
    return { invoice: existing, created: false };
  }

  const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
  await supabase
    .from("billing_document_locks")
    .delete()
    .eq("subscription_id", subscription.id)
    .eq("period_end", subscription.current_period_end)
    .lt("created_at", staleBefore);

  const { error: lockError } = await supabase
    .from("billing_document_locks")
    .insert({
      subscription_id: subscription.id,
      period_end: subscription.current_period_end,
    });
  if (lockError) {
    if (lockError.code === "23505") {
      const concurrent = await findExistingInvoice(
        supabase,
        subscription.id,
        subscription.current_period_end,
      );
      if (concurrent) {
        return { invoice: concurrent, created: false };
      }
      throw new Error(
        "Billing documents are already being generated. Try again shortly.",
      );
    }
    throw new Error(lockError.message);
  }

  try {
    const [hostingResult, clientResult, contactsResult] = await Promise.all([
      supabase
        .from("hosting_services")
        .select("*")
        .eq("id", subscription.hosting_service_id)
        .single(),
      supabase
        .from("clients")
        .select("*")
        .eq("id", subscription.client_id)
        .single(),
      supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", subscription.client_id)
        .order("is_primary", { ascending: false }),
    ]);
    if (hostingResult.error || !hostingResult.data) {
      throw new Error(
        hostingResult.error?.message ?? "Hosting service not found.",
      );
    }
    if (clientResult.error || !clientResult.data) {
      throw new Error(clientResult.error?.message ?? "Client not found.");
    }
    if (contactsResult.error) {
      throw new Error(contactsResult.error.message);
    }

    const hosting = hostingResult.data;
    const client = clientResult.data;
    const contacts = contactsResult.data;
    const amount = lineAmount(subscription.quantity, subscription.unit_price);
    const issueDate = toDateOnlyString(new Date());
    const dueDate = subscription.current_period_end;
    const nextPeriod = calculateNextPeriod(
      parseDateOnly(subscription.current_period_end),
    );
    const description = [
      `${hosting.hosting_type} Hosting Renewal`,
      `Business Name: ${client.business_name}`,
      hosting.project_url ? `URL: ${hosting.project_url}` : null,
      "Hosting Duration: 1 year",
      `Hosting Period: ${format(nextPeriod.currentPeriodStart, "MMM yyyy")} to ${format(nextPeriod.currentPeriodEnd, "MMM yyyy")}`,
      `Amount: ${subscription.currency} ${subscription.unit_price}/year`,
    ]
      .filter(Boolean)
      .join("\n");
    const invoiceContact =
      contacts.find(
        (contact) => contact.is_primary && contact.receive_invoice,
      ) ??
      contacts.find((contact) => contact.receive_invoice) ??
      null;
    const provider = getInvoiceProvider(subscription.currency);
    const providerInput = {
      currency: subscription.currency,
      externalCustomerId: client.zoho_contact_id,
      clientName: client.business_name,
      billingName: client.billing_name,
      billingAddress: client.billing_address,
      country: client.country,
      contact: invoiceContact
        ? {
            name: invoiceContact.name,
            email: invoiceContact.email,
            phone: invoiceContact.phone,
          }
        : null,
      description,
      quantity: subscription.quantity,
      unitPrice: subscription.unit_price,
      issueDate,
      dueDate,
      referenceNumber: `hosting:${subscription.id}:${subscription.current_period_end}`,
    };
    const providerResult = provider.createQuotationAndInvoice
      ? await provider.createQuotationAndInvoice(providerInput)
      : await provider.createInvoice(providerInput);

    let invoiceNumber = providerResult.invoiceNumber;
    if (!invoiceNumber) {
      const { data, error } = await supabase.rpc("allocate_invoice_number");
      if (error || !data) {
        throw new Error(error?.message ?? "Could not allocate invoice number.");
      }
      invoiceNumber = data;
    }

    const quotationMetadata = isQuotationAndInvoiceResult(providerResult)
      ? {
          external_quotation_id: providerResult.externalQuotationId,
          quotation_number: providerResult.quotationNumber,
          quotation_url: providerResult.quotationUrl ?? null,
        }
      : {
          external_quotation_id: null,
          quotation_number: null,
          quotation_url: null,
        };
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: subscription.client_id,
        subscription_id: subscription.id,
        invoice_number: invoiceNumber,
        provider: providerResult.provider,
        external_invoice_id: providerResult.externalInvoiceId,
        invoice_url: providerResult.invoiceUrl ?? null,
        ...quotationMetadata,
        issue_date: issueDate,
        due_date: dueDate,
        billing_period_end: subscription.current_period_end,
        currency: subscription.currency,
        subtotal: amount,
        total: amount,
        status: "DRAFT",
      })
      .select("*")
      .single();
    if (invoiceError || !invoice) {
      throw new Error(invoiceError?.message ?? "Could not create invoice.");
    }

    if (
      providerResult.externalCustomerId &&
      providerResult.externalCustomerId !== client.zoho_contact_id
    ) {
      await supabase
        .from("clients")
        .update({ zoho_contact_id: providerResult.externalCustomerId })
        .eq("id", client.id);
    }

    const { error: itemError } = await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      description,
      quantity: subscription.quantity,
      unit_price: subscription.unit_price,
      amount,
    });
    if (itemError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      throw new Error(itemError.message);
    }

    return { invoice, created: true };
  } finally {
    await supabase
      .from("billing_document_locks")
      .delete()
      .eq("subscription_id", subscription.id)
      .eq("period_end", subscription.current_period_end);
  }
}
