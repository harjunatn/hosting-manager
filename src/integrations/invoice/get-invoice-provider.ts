import type { CurrencyCode } from "@/lib/supabase/database.types";
import type { InvoiceProvider } from "@/integrations/invoice/invoice-provider";
import { MockInvoiceProvider } from "@/integrations/invoice/mock-invoice-provider";

const zohoMock = new MockInvoiceProvider("MOCK-ZOHO");
const flowAccountMock = new MockInvoiceProvider("MOCK-FLOWACCOUNT");

export function getInvoiceProvider(currency: CurrencyCode): InvoiceProvider {
  // Later: SGD → Zoho Books, THB → FlowAccount.
  if (currency === "THB") {
    return flowAccountMock;
  }
  return zohoMock;
}
