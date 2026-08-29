export const INVOICE_DUE_DAYS = 14;
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_BUCKET = "payment-receipts";
export const EXPIRING_WITHIN_DAYS = 30;

export const RECEIPT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const HOSTING_TYPE_OPTIONS = ["3DVista", "GoThru"] as const;

export const CURRENCIES = ["SGD", "THB"] as const;
export type Currency = (typeof CURRENCIES)[number];
