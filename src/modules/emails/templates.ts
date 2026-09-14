import { formatDate, formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/supabase/database.types";

export type RenewalEmailDetails = {
  contactName: string;
  clientName: string;
  projectUrl: string | null;
  expiryDate: string;
  amount: string;
  currency: CurrencyCode;
  invoiceNumber: string | null;
  daysUntilExpiry: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayAmount(details: RenewalEmailDetails) {
  return `${details.currency} ${formatMoney(details.amount, details.currency)}`;
}

function invoiceDetails(details: RenewalEmailDetails) {
  const rows = [
    details.projectUrl
      ? `<tr><td style="padding:6px 12px"><strong>Hosted Tour URL</strong></td><td style="padding:6px 12px"><a href="${escapeHtml(details.projectUrl)}">${escapeHtml(details.projectUrl)}</a></td></tr>`
      : "",
    `<tr><td style="padding:6px 12px"><strong>Renewal Amount</strong></td><td style="padding:6px 12px">${escapeHtml(displayAmount(details))}</td></tr>`,
    `<tr><td style="padding:6px 12px"><strong>Renewal Expiry Date</strong></td><td style="padding:6px 12px">${escapeHtml(formatDate(details.expiryDate))}</td></tr>`,
    details.invoiceNumber
      ? `<tr><td style="padding:6px 12px"><strong>Invoice</strong></td><td style="padding:6px 12px">${escapeHtml(details.invoiceNumber)}</td></tr>`
      : "",
  ].join("");

  return `<table style="border-collapse:collapse;border:1px solid #d1d5db">${rows}</table>`;
}

function commonFooter() {
  return `
    <hr style="border:0;border-top:1px solid #d1d5db;margin:24px 0" />
    <p>If you have any questions regarding your hosted tour subscription or renewal, please reply to this email.</p>
    <p>Thank you for your continued support.</p>
  `;
}

export function buildInvoiceEmail(details: RenewalEmailDetails) {
  const subject =
    `Hosting renewal quotation and invoice ${details.invoiceNumber ?? ""}`.trim();
  const text = [
    `Hi ${details.contactName},`,
    "",
    `Please find attached the hosting renewal quotation and invoice for ${details.clientName}.`,
    `Expiry date: ${formatDate(details.expiryDate)}`,
    `Amount: ${displayAmount(details)}`,
    details.invoiceNumber ? `Invoice: ${details.invoiceNumber}` : null,
    details.projectUrl ? `Hosted Tour URL: ${details.projectUrl}` : null,
    "",
    "Please reply to this email if you have any questions.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(details.contactName)},</p>
      <p>Please find attached the hosting renewal quotation and invoice for <strong>${escapeHtml(details.clientName)}</strong>.</p>
      ${invoiceDetails(details)}
      ${commonFooter()}
    `,
  };
}

export function buildRenewalReminderEmail(details: RenewalEmailDetails) {
  const expired = details.daysUntilExpiry < 0;
  const timing = expired
    ? "expired yesterday"
    : `will expire in ${details.daysUntilExpiry} day${details.daysUntilExpiry === 1 ? "" : "s"}`;
  const subject = expired
    ? `Hosting subscription expired — ${details.clientName}`
    : `Hosting renewal reminder — ${details.daysUntilExpiry} days remaining`;
  const notice = expired
    ? "The hosted tour subscription has expired and may be deactivated until payment is received."
    : `This is a friendly reminder that the hosted tour subscription ${timing}.`;
  const text = [
    `Hi ${details.contactName},`,
    "",
    notice,
    `Expiry date: ${formatDate(details.expiryDate)}`,
    `Amount: ${displayAmount(details)}`,
    details.invoiceNumber ? `Invoice: ${details.invoiceNumber}` : null,
    details.projectUrl ? `Hosted Tour URL: ${details.projectUrl}` : null,
    "",
    "Please reply to this email if you have any questions.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject,
    text,
    html: `
      <p>Hi ${escapeHtml(details.contactName)},</p>
      <p>${escapeHtml(notice)}</p>
      ${invoiceDetails(details)}
      ${
        expired
          ? '<p style="color:#991b1b"><strong>Please note:</strong> Access may no longer be available until payment has been received.</p>'
          : ""
      }
      ${commonFooter()}
    `,
  };
}
