import type { CurrencyCode } from "@/lib/supabase/database.types";
import type { InvoiceProvider } from "@/integrations/invoice/invoice-provider";
import { MockInvoiceProvider } from "@/integrations/invoice/mock-invoice-provider";
import {
  getZohoBooksConfig,
  ZohoBooksInvoiceProvider,
} from "@/integrations/invoice/zoho-books-invoice-provider";

const zohoMock = new MockInvoiceProvider("MOCK-ZOHO");
const flowAccountMock = new MockInvoiceProvider("MOCK-FLOWACCOUNT");
let zohoProvider: ZohoBooksInvoiceProvider | null = null;

export function getZohoBooksInvoiceProvider() {
  const config = getZohoBooksConfig();
  if (!config) {
    return null;
  }
  zohoProvider ??= new ZohoBooksInvoiceProvider(config);
  return zohoProvider;
}

export function getInvoiceProvider(currency: CurrencyCode): InvoiceProvider {
  if (currency === "THB") {
    return flowAccountMock;
  }
  return getZohoBooksInvoiceProvider() ?? zohoMock;
}
