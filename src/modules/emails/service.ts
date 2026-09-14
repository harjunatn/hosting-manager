import type { SupabaseClient } from "@supabase/supabase-js";

import { getZohoBooksInvoiceProvider } from "@/integrations/invoice/get-invoice-provider";
import {
  getResendEmailProvider,
  type EmailAttachment,
} from "@/integrations/email/resend-email-provider";
import { ZOHO_PROVIDER } from "@/integrations/invoice/zoho-books-invoice-provider";
import { lineAmount } from "@/lib/money";
import type {
  ClientContact,
  Database,
  EmailDelivery,
  EmailType,
  Invoice,
} from "@/lib/supabase/database.types";
import {
  buildInvoiceEmail,
  buildRenewalReminderEmail,
  type RenewalEmailDetails,
} from "@/modules/emails/templates";

type EmailDeliveryInput = {
  subscriptionId: string;
  invoiceId: string | null;
  contact: ClientContact;
  emailType: EmailType;
  milestoneDays: number | null;
  periodEnd: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
};

async function officialInvoiceAttachment(
  invoice: Invoice,
): Promise<EmailAttachment> {
  if (invoice.provider !== ZOHO_PROVIDER || !invoice.external_invoice_id) {
    throw new Error("An official Zoho invoice PDF is required before sending.");
  }
  const zoho = getZohoBooksInvoiceProvider();
  if (!zoho?.getInvoicePdf) {
    throw new Error("Zoho Books is not configured.");
  }
  const pdf = await zoho.getInvoicePdf(invoice.external_invoice_id);
  return {
    filename: `${invoice.invoice_number.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`,
    content: Buffer.from(pdf),
    contentType: "application/pdf",
  };
}

async function officialQuotationAttachment(
  invoice: Invoice,
): Promise<EmailAttachment | null> {
  if (!invoice.external_quotation_id) {
    return null;
  }
  if (invoice.provider !== ZOHO_PROVIDER) {
    throw new Error(
      "An official Zoho quotation PDF is required before sending.",
    );
  }
  const zoho = getZohoBooksInvoiceProvider();
  if (!zoho?.getQuotationPdf) {
    throw new Error("Zoho Books quotation delivery is not configured.");
  }
  const pdf = await zoho.getQuotationPdf(invoice.external_quotation_id);
  const number = invoice.quotation_number ?? "quotation";
  return {
    filename: `${number.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`,
    content: Buffer.from(pdf),
    contentType: "application/pdf",
  };
}

async function markZohoDocumentsSent(
  invoice: Invoice,
  includeQuotation: boolean,
) {
  if (invoice.provider !== ZOHO_PROVIDER || !invoice.external_invoice_id) {
    return;
  }
  const zoho = getZohoBooksInvoiceProvider();
  if (!zoho?.markInvoiceSent) {
    throw new Error("Zoho Books invoice status updates are not configured.");
  }

  const updates: Promise<void>[] = [
    zoho.markInvoiceSent(invoice.external_invoice_id),
  ];
  if (includeQuotation && invoice.external_quotation_id) {
    if (!zoho.markQuotationSent) {
      throw new Error(
        "Zoho Books quotation status updates are not configured.",
      );
    }
    updates.push(zoho.markQuotationSent(invoice.external_quotation_id));
  }
  await Promise.all(updates);
}

export function invoiceEmailAttachments(
  invoiceAttachment: EmailAttachment,
  quotationAttachment: EmailAttachment | null,
) {
  return quotationAttachment
    ? [quotationAttachment, invoiceAttachment]
    : [invoiceAttachment];
}

async function findExistingDelivery(
  supabase: SupabaseClient<Database>,
  input: EmailDeliveryInput,
) {
  let query = supabase
    .from("email_deliveries")
    .select("*")
    .eq("subscription_id", input.subscriptionId)
    .eq("email_type", input.emailType)
    .eq("recipient_email", input.contact.email);

  if (input.emailType === "INVOICE") {
    query = query.eq("invoice_id", input.invoiceId!);
  } else {
    query = query
      .eq("period_end", input.periodEnd)
      .eq("milestone_days", input.milestoneDays!);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function getOrCreateDelivery(
  supabase: SupabaseClient<Database>,
  input: EmailDeliveryInput,
) {
  const existing = await findExistingDelivery(supabase, input);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("email_deliveries")
    .insert({
      subscription_id: input.subscriptionId,
      invoice_id: input.invoiceId,
      client_contact_id: input.contact.id,
      email_type: input.emailType,
      milestone_days: input.milestoneDays,
      period_end: input.periodEnd,
      recipient_email: input.contact.email,
      delivery_email: input.contact.email,
      subject: input.subject,
      status: "QUEUED",
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      const concurrent = await findExistingDelivery(supabase, input);
      if (concurrent) {
        return concurrent;
      }
    }
    throw new Error(error?.message ?? "Could not queue the email.");
  }
  return data;
}

async function sendTrackedEmail(
  supabase: SupabaseClient<Database>,
  input: EmailDeliveryInput,
) {
  const provider = getResendEmailProvider();
  if (!provider) {
    throw new Error("Resend is not configured.");
  }

  const delivery = await getOrCreateDelivery(supabase, input);
  if (
    delivery.status !== "QUEUED" &&
    delivery.status !== "FAILED"
  ) {
    return { delivery, sent: false };
  }

  try {
    const result = await provider.send({
      recipient: input.contact.email,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
      idempotencyKey: `delivery/${delivery.id}`,
      tags: [
        { name: "email_type", value: input.emailType.toLowerCase() },
        { name: "subscription_id", value: input.subscriptionId },
      ],
    });
    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("email_deliveries")
      .update({
        provider_message_id: result.providerMessageId,
        delivery_email: result.deliveryEmail,
        subject: result.subject,
        status: "SENT",
        sent_at: now,
        event_at: now,
        error_message: null,
      })
      .eq("id", delivery.id)
      .select("*")
      .single();
    if (error || !updated) {
      throw new Error(error?.message ?? "Could not record the sent email.");
    }
    return { delivery: updated, sent: true };
  } catch (error) {
    await supabase
      .from("email_deliveries")
      .update({
        status: "FAILED",
        failed_at: new Date().toISOString(),
        error_message:
          error instanceof Error ? error.message : "Email could not be sent.",
      })
      .eq("id", delivery.id);
    throw error;
  }
}

async function loadEmailContext(
  supabase: SupabaseClient<Database>,
  subscriptionId: string,
) {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();
  if (subscriptionError || !subscription) {
    throw new Error(subscriptionError?.message ?? "Subscription not found.");
  }

  const [clientResult, hostingResult, contactsResult] = await Promise.all([
    supabase.from("clients").select("*").eq("id", subscription.client_id).single(),
    supabase
      .from("hosting_services")
      .select("*")
      .eq("id", subscription.hosting_service_id)
      .single(),
    supabase
      .from("client_contacts")
      .select("*")
      .eq("client_id", subscription.client_id)
      .order("is_primary", { ascending: false }),
  ]);
  if (clientResult.error || !clientResult.data) {
    throw new Error(clientResult.error?.message ?? "Client not found.");
  }
  if (hostingResult.error || !hostingResult.data) {
    throw new Error(hostingResult.error?.message ?? "Hosting service not found.");
  }
  if (contactsResult.error) {
    throw new Error(contactsResult.error.message);
  }

  return {
    subscription,
    client: clientResult.data,
    hosting: hostingResult.data,
    contacts: contactsResult.data,
  };
}

function emailDetails(
  context: Awaited<ReturnType<typeof loadEmailContext>>,
  invoice: Invoice | null,
  contact: ClientContact,
  daysUntilExpiry: number,
): RenewalEmailDetails {
  return {
    contactName: contact.name,
    clientName: context.client.business_name,
    projectUrl: context.hosting.project_url,
    expiryDate: context.subscription.current_period_end,
    amount: lineAmount(
      context.subscription.quantity,
      context.subscription.unit_price,
    ),
    currency: context.subscription.currency,
    invoiceNumber: invoice?.invoice_number ?? null,
    daysUntilExpiry,
  };
}

export async function sendInvoiceEmail(
  supabase: SupabaseClient<Database>,
  invoice: Invoice,
) {
  const context = await loadEmailContext(supabase, invoice.subscription_id);
  const recipients = context.contacts.filter((contact) => contact.receive_invoice);
  if (recipients.length === 0) {
    throw new Error("No contact is configured to receive invoices.");
  }
  const [quotationAttachment, invoiceAttachment] = await Promise.all([
    officialQuotationAttachment(invoice),
    officialInvoiceAttachment(invoice),
  ]);
  const attachments = invoiceEmailAttachments(
    invoiceAttachment,
    quotationAttachment,
  );
  let sentCount = 0;

  for (const contact of recipients) {
    const template = buildInvoiceEmail(
      emailDetails(context, invoice, contact, 0),
    );
    const result = await sendTrackedEmail(supabase, {
      subscriptionId: invoice.subscription_id,
      invoiceId: invoice.id,
      contact,
      emailType: "INVOICE",
      milestoneDays: null,
      periodEnd: invoice.billing_period_end ?? context.subscription.current_period_end,
      ...template,
      attachments,
    });
    if (result.sent) {
      sentCount += 1;
    }
  }

  await markZohoDocumentsSent(invoice, true);

  const { error } = await supabase
    .from("invoices")
    .update({ status: "SENT" })
    .eq("id", invoice.id);
  if (error) {
    throw new Error(error.message);
  }
  return sentCount;
}

export async function sendRenewalReminder(
  supabase: SupabaseClient<Database>,
  input: {
    subscriptionId: string;
    invoice: Invoice | null;
    daysUntilExpiry: number;
  },
) {
  const context = await loadEmailContext(supabase, input.subscriptionId);
  const recipients = context.contacts.filter((contact) => contact.receive_reminder);
  if (recipients.length === 0) {
    return 0;
  }
  const attachment = input.invoice
    ? await officialInvoiceAttachment(input.invoice)
    : undefined;
  const emailType: EmailType =
    input.daysUntilExpiry < 0 ? "DEACTIVATION_NOTICE" : "RENEWAL_REMINDER";
  let sentCount = 0;

  for (const contact of recipients) {
    const template = buildRenewalReminderEmail(
      emailDetails(context, input.invoice, contact, input.daysUntilExpiry),
    );
    const result = await sendTrackedEmail(supabase, {
      subscriptionId: input.subscriptionId,
      invoiceId: input.invoice?.id ?? null,
      contact,
      emailType,
      milestoneDays: input.daysUntilExpiry,
      periodEnd: context.subscription.current_period_end,
      ...template,
      attachments: attachment ? [attachment] : undefined,
    });
    if (result.sent) {
      sentCount += 1;
    }
  }

  if (input.invoice?.status === "DRAFT") {
    await markZohoDocumentsSent(input.invoice, false);

    const { error } = await supabase
      .from("invoices")
      .update({ status: "SENT" })
      .eq("id", input.invoice.id);
    if (error) {
      throw new Error(error.message);
    }
  }
  return sentCount;
}

export function webhookStatusUpdate(
  eventType: string,
  eventAt: string,
  data: Record<string, unknown>,
): Partial<EmailDelivery> | null {
  switch (eventType) {
    case "email.sent":
      return { status: "SENT", sent_at: eventAt, event_at: eventAt };
    case "email.delivered":
      return {
        status: "DELIVERED",
        delivered_at: eventAt,
        event_at: eventAt,
      };
    case "email.opened":
      return { status: "OPENED", opened_at: eventAt, event_at: eventAt };
    case "email.bounced":
      return {
        status: "BOUNCED",
        bounced_at: eventAt,
        event_at: eventAt,
        error_message:
          typeof data.bounce === "object" &&
          data.bounce &&
          "message" in data.bounce
            ? String(data.bounce.message)
            : "Email bounced.",
      };
    case "email.failed":
      return {
        status: "FAILED",
        failed_at: eventAt,
        event_at: eventAt,
        error_message:
          typeof data.failed === "object" &&
          data.failed &&
          "message" in data.failed
            ? String(data.failed.message)
            : "Email delivery failed.",
      };
    case "email.complained":
      return { status: "COMPLAINED", event_at: eventAt };
    case "email.suppressed":
      return { status: "SUPPRESSED", event_at: eventAt };
    default:
      return null;
  }
}
