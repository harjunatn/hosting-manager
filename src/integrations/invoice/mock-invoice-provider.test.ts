import { describe, expect, it } from "vitest";

import { getInvoiceProvider } from "@/integrations/invoice/get-invoice-provider";
import { resetMockInvoiceCounters } from "@/integrations/invoice/mock-invoice-provider";

describe("getInvoiceProvider", () => {
  it("returns mock Zoho IDs for SGD and mock FlowAccount IDs for THB", async () => {
    resetMockInvoiceCounters();

    const sgd = await getInvoiceProvider("SGD").createInvoice({
      currency: "SGD",
      clientName: "JW Marriott Singapore",
      description: "Annual 3DVista Hosting",
      quantity: 1,
      unitPrice: "250.00",
    });

    const thb = await getInvoiceProvider("THB").createInvoice({
      currency: "THB",
      clientName: "Bangkok Demo Kitchen",
      description: "Annual GoThru Hosting",
      quantity: 1,
      unitPrice: "4500.00",
    });

    expect(sgd.externalInvoiceId).toBe("MOCK-ZOHO-000001");
    expect(thb.externalInvoiceId).toBe("MOCK-FLOWACCOUNT-000001");
  });
});
