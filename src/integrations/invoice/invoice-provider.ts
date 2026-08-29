import type { CurrencyCode } from "@/lib/supabase/database.types";

export type CreateInvoiceInput = {
  currency: CurrencyCode;
  clientName: string;
  description: string;
  quantity: number;
  unitPrice: string;
};

export type CreateInvoiceResult = {
  provider: string;
  externalInvoiceId: string;
};

export interface InvoiceProvider {
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
}
