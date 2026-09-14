import { describe, expect, it, vi } from "vitest";

import {
  getZohoBooksConfig,
  ZohoBooksInvoiceProvider,
  type ZohoBooksConfig,
} from "@/integrations/invoice/zoho-books-invoice-provider";

const config: ZohoBooksConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  organizationId: "organization-id",
  accountsUrl: "https://accounts.zoho.com",
  apiVersion: "v3",
  itemName: "Hosting Renewal",
};

const invoiceInput = {
  currency: "SGD" as const,
  externalCustomerId: null,
  clientName: "Anderson Secondary School",
  billingName: "Anderson Secondary School",
  billingAddress: "Singapore",
  country: "Singapore",
  contact: {
    name: "Finance",
    email: "finance@example.com",
    phone: null,
  },
  description: "Hosting Renewal\nHosting Duration: 1 year",
  quantity: 1,
  unitPrice: "150.00",
  issueDate: "2026-09-01",
  dueDate: "2026-10-31",
  referenceNumber: "hosting:subscription-id:2026-10-31",
};

describe("getZohoBooksConfig", () => {
  it("keeps Zoho disabled unless explicitly enabled", () => {
    expect(getZohoBooksConfig({})).toBeNull();
  });

  it("rejects incomplete enabled configuration", () => {
    expect(() =>
      getZohoBooksConfig({ ZOHO_BOOKS_ENABLED: "true" }),
    ).toThrow("ZOHO_CLIENT_ID is required");
  });
});

describe("ZohoBooksInvoiceProvider", () => {
  it("finds the configured item, creates a contact, and creates an invoice", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          api_domain: "https://www.zohoapis.com",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          items: [{ item_id: "item-id", name: "Hosting Renewal" }],
        }),
      )
      .mockResolvedValueOnce(Response.json({ code: 0, contacts: [] }))
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          contact: {
            contact_id: "contact-id",
            contact_name: "Anderson Secondary School",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          invoice: {
            invoice_id: "invoice-id",
            invoice_number: "TRM-006190",
            invoice_url: "https://books.zoho.com/invoice/invoice-id",
          },
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await expect(provider.createInvoice(invoiceInput)).resolves.toEqual({
      provider: "ZOHO_BOOKS",
      externalInvoiceId: "invoice-id",
      externalCustomerId: "contact-id",
      invoiceNumber: "TRM-006190",
      invoiceUrl: "https://books.zoho.com/invoice/invoice-id",
    });

    const createInvoiceRequest = fetchMock.mock.calls[4];
    expect(createInvoiceRequest?.[0]).toContain(
      "/books/v3/invoices?organization_id=organization-id",
    );
    const body = JSON.parse(
      String((createInvoiceRequest?.[1] as RequestInit).body),
    );
    expect(body).toMatchObject({
      customer_id: "contact-id",
      date: "2026-09-01",
      due_date: "2026-10-31",
      payment_terms: 60,
      reference_number: "hosting:subscription-id:2026-10-31",
      line_items: [
        {
          item_id: "item-id",
          name: "Hosting Renewal",
          quantity: 1,
          rate: 150,
        },
      ],
    });
  });

  it("downloads the official PDF using the cached access token", async () => {
    const pdf = new Uint8Array([37, 80, 68, 70]).buffer;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          api_domain: "https://www.zohoapis.com",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        new Response(pdf, {
          headers: { "content-type": "application/pdf" },
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await expect(provider.getInvoicePdf("invoice-id")).resolves.toEqual(pdf);
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      "/books/v3/invoices/invoice-id?organization_id=organization-id",
    );
  });

  it("creates a quotation and a linked invoice", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          api_domain: "https://www.zohoapis.com",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          items: [{ item_id: "item-id", name: "Hosting Renewal" }],
        }),
      )
      .mockResolvedValueOnce(Response.json({ code: 0, estimates: [] }))
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          estimate: {
            estimate_id: "estimate-id",
            estimate_number: "EST-00042",
            estimate_url: "https://books.zoho.com/estimate/estimate-id",
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ code: 0, invoices: [] }))
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          invoice: {
            invoice_id: "invoice-id",
            invoice_number: "TRM-006190",
            invoice_url: "https://books.zoho.com/invoice/invoice-id",
          },
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await expect(
      provider.createQuotationAndInvoice({
        ...invoiceInput,
        externalCustomerId: "contact-id",
      }),
    ).resolves.toEqual({
      provider: "ZOHO_BOOKS",
      externalInvoiceId: "invoice-id",
      externalCustomerId: "contact-id",
      invoiceNumber: "TRM-006190",
      invoiceUrl: "https://books.zoho.com/invoice/invoice-id",
      externalQuotationId: "estimate-id",
      quotationNumber: "EST-00042",
      quotationUrl: "https://books.zoho.com/estimate/estimate-id",
    });

    const estimateBody = JSON.parse(
      String((fetchMock.mock.calls[3]?.[1] as RequestInit).body),
    );
    expect(estimateBody).toMatchObject({
      customer_id: "contact-id",
      reference_number:
        "hosting:subscription-id:2026-10-31:quotation",
      expiry_date: "2026-10-31",
    });
    const invoiceBody = JSON.parse(
      String((fetchMock.mock.calls[5]?.[1] as RequestInit).body),
    );
    expect(invoiceBody).toMatchObject({
      customer_id: "contact-id",
      reference_number: "hosting:subscription-id:2026-10-31",
      invoiced_estimate_id: "estimate-id",
    });
  });

  it("reuses quotation and invoice records found by reference", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          api_domain: "https://www.zohoapis.com",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          items: [{ item_id: "item-id", name: "Hosting Renewal" }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          estimates: [
            {
              estimate_id: "estimate-id",
              estimate_number: "EST-00042",
              reference_number:
                "hosting:subscription-id:2026-10-31:quotation",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          invoices: [
            {
              invoice_id: "invoice-id",
              invoice_number: "TRM-006190",
              reference_number: "hosting:subscription-id:2026-10-31",
            },
          ],
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await provider.createQuotationAndInvoice({
      ...invoiceInput,
      externalCustomerId: "contact-id",
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.slice(2).every((call) => {
      const method = (call[1] as RequestInit | undefined)?.method;
      return !method || method === "GET";
    })).toBe(true);
  });

  it("downloads quotation and invoice PDFs", async () => {
    const invoicePdf = new Uint8Array([37, 80, 68, 70, 1]).buffer;
    const quotationPdf = new Uint8Array([37, 80, 68, 70, 2]).buffer;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          api_domain: "https://www.zohoapis.com",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(new Response(invoicePdf))
      .mockResolvedValueOnce(new Response(quotationPdf));
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await expect(provider.getInvoicePdf("invoice-id")).resolves.toEqual(
      invoicePdf,
    );
    await expect(provider.getQuotationPdf("estimate-id")).resolves.toEqual(
      quotationPdf,
    );
    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      "/books/v3/estimates/estimate-id?organization_id=organization-id",
    );
  });
});
