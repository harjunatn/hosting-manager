import { describe, expect, it } from "vitest";

import { validateReceiptFile } from "@/modules/payments/receipt-validation";
import { RECEIPT_MAX_BYTES } from "@/lib/constants";

describe("validateReceiptFile", () => {
  it("rejects missing files", () => {
    expect(validateReceiptFile(null)).toBe("Choose a receipt to upload.");
    expect(validateReceiptFile(undefined)).toBe("Choose a receipt to upload.");
  });

  it("rejects files over the size limit", () => {
    const file = new File(["x"], "receipt.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "size", { value: RECEIPT_MAX_BYTES + 1 });

    expect(validateReceiptFile(file)).toBe(
      "Receipt must be 5 MB or smaller.",
    );
  });

  it("accepts allowed receipt types within the size limit", () => {
    const file = new File(["x"], "receipt.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "size", { value: RECEIPT_MAX_BYTES });

    expect(validateReceiptFile(file)).toBeNull();
  });

  it("rejects unsupported file types", () => {
    const file = new File(["x"], "receipt.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: 1024 });

    expect(validateReceiptFile(file)).toBe(
      "Upload a PDF, JPG, or PNG receipt.",
    );
  });
});
