import { RECEIPT_MAX_BYTES, RECEIPT_MIME_TYPES } from "@/lib/constants";

export const RECEIPT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;

export function formatReceiptMaxSize() {
  return "5 MB";
}

function hasAllowedReceiptType(file: File) {
  if ((RECEIPT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return true;
  }
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function validateReceiptFile(
  file: File | null | undefined,
): string | null {
  if (!file || file.size === 0) {
    return "Choose a receipt to upload.";
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return `Receipt must be ${formatReceiptMaxSize()} or smaller.`;
  }
  if (!hasAllowedReceiptType(file)) {
    return "Upload a PDF, JPG, or PNG receipt.";
  }
  return null;
}
