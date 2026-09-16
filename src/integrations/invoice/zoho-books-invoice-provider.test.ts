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
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          currencies: [
            {
              currency_id: "sgd-currency-id",
              currency_code: "SGD",
              exchange_rate: 0.001,
              is_base_currency: false,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ code: 0, contacts: [] }))
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          contact: {
            contact_id: "contact-id",
            contact_name: "Anderson Secondary School",
            currency_id: "sgd-currency-id",
            currency_code: "SGD",
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
            currency_id: "sgd-currency-id",
            currency_code: "SGD",
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

    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      "/books/v3/settings/currencies?organization_id=organization-id",
    );
    const createContactRequest = fetchMock.mock.calls[4];
    expect(
      JSON.parse(String((createContactRequest?.[1] as RequestInit).body)),
    ).toMatchObject({
      contact_name: "Anderson Secondary School",
      company_name: "Anderson Secondary School",
      currency_id: "sgd-currency-id",
    });
    const createInvoiceRequest = fetchMock.mock.calls[5];
    expect(createInvoiceRequest?.[0]).toContain(
      "/books/v3/invoices?organization_id=organization-id",
    );
    const body = JSON.parse(
      String((createInvoiceRequest?.[1] as RequestInit).body),
    );
    expect(body).toMatchObject({
      customer_id: "contact-id",
      currency_id: "sgd-currency-id",
      exchange_rate: 0.001,
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

  it("fails when the requested currency is not configured in Zoho Books", async () => {
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
          currencies: [
            {
              currency_id: "idr-currency-id",
              currency_code: "IDR",
              exchange_rate: 1,
              is_base_currency: true,
            },
          ],
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await expect(provider.createInvoice(invoiceInput)).rejects.toThrow(
      'Zoho Books: Currency "SGD" was not found.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          currencies: [
            {
              currency_id: "sgd-currency-id",
              currency_code: "SGD",
              exchange_rate: 0.001,
              is_base_currency: false,
            },
          ],
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
            currency_id: "sgd-currency-id",
            currency_code: "SGD",
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
            currency_id: "sgd-currency-id",
            currency_code: "SGD",
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
      String((fetchMock.mock.calls[4]?.[1] as RequestInit).body),
    );
    expect(estimateBody).toMatchObject({
      customer_id: "contact-id",
      currency_id: "sgd-currency-id",
      exchange_rate: 0.001,
      reference_number:
        "hosting:subscription-id:2026-10-31:quotation",
      expiry_date: "2026-10-31",
    });
    const invoiceBody = JSON.parse(
      String((fetchMock.mock.calls[6]?.[1] as RequestInit).body),
    );
    expect(invoiceBody).toMatchObject({
      customer_id: "contact-id",
      currency_id: "sgd-currency-id",
      exchange_rate: 0.001,
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
          currencies: [
            {
              currency_id: "sgd-currency-id",
              currency_code: "SGD",
              exchange_rate: 0.001,
              is_base_currency: false,
            },
          ],
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
              currency_id: "sgd-currency-id",
              currency_code: "SGD",
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
              currency_id: "sgd-currency-id",
              currency_code: "SGD",
            },
          ],
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await provider.createQuotationAndInvoice({
      ...invoiceInput,
      externalCustomerId: "contact-id",
    });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.slice(3).every((call) => {
      const method = (call[1] as RequestInit | undefined)?.method;
      return !method || method === "GET";
    })).toBe(true);
  });

  it("records a bank transfer against the Zoho invoice", async () => {
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
        Response.json({ code: 0, customer_payments: [] }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          invoice: {
            invoice_id: "invoice-id",
            invoice_number: "TRM-006190",
            status: "draft",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          message: "Invoice status has been changed to Sent.",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          payment: {
            payment_id: "payment-id",
            reference_number: "payment:invoice-id",
          },
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await expect(
      provider.recordPayment({
        externalInvoiceId: "invoice-id",
        externalCustomerId: "contact-id",
        amount: "150.00",
        date: "2026-09-14",
        referenceNumber: "payment:invoice-id",
        description: "Admin-confirmed payment for TRM-006190",
      }),
    ).resolves.toEqual({ externalPaymentId: "payment-id" });

    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      "/books/v3/customerpayments?organization_id=organization-id&reference_number=payment%3Ainvoice-id",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      "/books/v3/invoices/invoice-id?organization_id=organization-id",
    );
    expect(fetchMock.mock.calls[3]?.[0]).toContain(
      "/books/v3/invoices/invoice-id/status/sent?organization_id=organization-id",
    );
    expect((fetchMock.mock.calls[3]?.[1] as RequestInit).method).toBe("POST");
    const createPaymentRequest = fetchMock.mock.calls[4];
    expect(createPaymentRequest?.[0]).toContain(
      "/books/v3/customerpayments?organization_id=organization-id",
    );
    expect(
      JSON.parse(String((createPaymentRequest?.[1] as RequestInit).body)),
    ).toEqual({
      customer_id: "contact-id",
      payment_mode: "banktransfer",
      amount: 150,
      date: "2026-09-14",
      reference_number: "payment:invoice-id",
      description: "Admin-confirmed payment for TRM-006190",
      invoices: [{ invoice_id: "invoice-id", amount_applied: 150 }],
    });
  });

  it("reuses a Zoho payment with the same reference", async () => {
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
          customer_payments: [
            {
              payment_id: "existing-payment-id",
              reference_number: "payment:invoice-id",
            },
          ],
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await expect(
      provider.recordPayment({
        externalInvoiceId: "invoice-id",
        externalCustomerId: "contact-id",
        amount: "150.00",
        date: "2026-09-14",
        referenceNumber: "payment:invoice-id",
      }),
    ).resolves.toEqual({ externalPaymentId: "existing-payment-id" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks draft quotation and invoice documents as sent", async () => {
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
          invoice: {
            invoice_id: "invoice-id",
            invoice_number: "TRM-006190",
            status: "draft",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          message: "Invoice status has been changed to Sent.",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          estimate: {
            estimate_id: "estimate-id",
            estimate_number: "EST-00042",
            status: "draft",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          message: "Estimate status has been changed to Sent.",
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await provider.markInvoiceSent("invoice-id");
    await provider.markQuotationSent("estimate-id");

    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      "/books/v3/invoices/invoice-id/status/sent?organization_id=organization-id",
    );
    expect((fetchMock.mock.calls[2]?.[1] as RequestInit).method).toBe("POST");
    expect(fetchMock.mock.calls[4]?.[0]).toContain(
      "/books/v3/estimates/estimate-id/status/sent?organization_id=organization-id",
    );
    expect((fetchMock.mock.calls[4]?.[1] as RequestInit).method).toBe("POST");
  });

  it("does not resend documents that already left draft status", async () => {
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
          invoice: {
            invoice_id: "invoice-id",
            invoice_number: "TRM-006190",
            status: "sent",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          code: 0,
          estimate: {
            estimate_id: "estimate-id",
            estimate_number: "EST-00042",
            status: "invoiced",
          },
        }),
      );
    const provider = new ZohoBooksInvoiceProvider(config, fetchMock);

    await provider.markInvoiceSent("invoice-id");
    await provider.markQuotationSent("estimate-id");

    expect(fetchMock).toHaveBeenCalledTimes(3);
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
