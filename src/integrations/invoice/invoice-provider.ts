import type { CurrencyCode } from "@/lib/supabase/database.types";

export type CreateInvoiceInput = {
  currency: CurrencyCode;
  externalCustomerId?: string | null;
  clientName: string;
  billingName: string;
  billingAddress?: string | null;
  country?: string | null;
  contact?: {
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  description: string;
  quantity: number;
  unitPrice: string;
  issueDate: string;
  dueDate: string;
  referenceNumber: string;
};

export type CreateInvoiceResult = {
  provider: string;
  externalInvoiceId: string;
  externalCustomerId?: string;
  invoiceNumber?: string;
  invoiceUrl?: string | null;
};

export type CreateQuotationAndInvoiceResult = CreateInvoiceResult & {
  externalQuotationId: string;
  quotationNumber: string;
  quotationUrl?: string | null;
};

export interface InvoiceProvider {
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  createQuotationAndInvoice?(
    input: CreateInvoiceInput,
  ): Promise<CreateQuotationAndInvoiceResult>;
  getInvoicePdf?(externalInvoiceId: string): Promise<ArrayBuffer>;
  getQuotationPdf?(externalQuotationId: string): Promise<ArrayBuffer>;
}
