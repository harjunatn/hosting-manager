import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  CreateQuotationAndInvoiceResult,
  InvoiceProvider,
} from "@/integrations/invoice/invoice-provider";

const ZOHO_PROVIDER = "ZOHO_BOOKS";
const DEFAULT_ACCOUNTS_URL = "https://accounts.zoho.com";
const DEFAULT_API_VERSION = "v3";
const DEFAULT_ITEM_NAME = "Hosting Renewal";

type Fetch = typeof fetch;
type Environment = Record<string, string | undefined>;

export type ZohoBooksConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  accountsUrl: string;
  apiVersion: string;
  itemName: string;
  invoiceTemplateId?: string;
  estimateTemplateId?: string;
};

type AccessToken = {
  value: string;
  apiDomain: string;
  expiresAt: number;
};

type ZohoTokenResponse = {
  access_token?: string;
  api_domain?: string;
  expires_in?: number;
  error?: string;
};

type ZohoEnvelope = {
  code?: number;
  message?: string;
};

type ZohoItem = {
  item_id: string | number;
  name: string;
};

type ZohoContact = {
  contact_id: string | number;
  contact_name: string;
  company_name?: string;
};

type ZohoInvoice = {
  invoice_id: string | number;
  invoice_number: string;
  invoice_url?: string;
  reference_number?: string;
};

type ZohoEstimate = {
  estimate_id: string | number;
  estimate_number: string;
  estimate_url?: string;
  reference_number?: string;
};

function requiredEnv(
  env: Environment,
  name: string,
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when Zoho Books is enabled.`);
  }
  return value;
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getZohoBooksConfig(
  env: Environment = process.env,
): ZohoBooksConfig | null {
  if (env.ZOHO_BOOKS_ENABLED !== "true") {
    return null;
  }

  return {
    clientId: requiredEnv(env, "ZOHO_CLIENT_ID"),
    clientSecret: requiredEnv(env, "ZOHO_CLIENT_SECRET"),
    refreshToken: requiredEnv(env, "ZOHO_REFRESH_TOKEN"),
    organizationId: requiredEnv(env, "ZOHO_ORGANIZATION_ID"),
    accountsUrl: withoutTrailingSlash(
      env.ZOHO_ACCOUNTS_URL?.trim() || DEFAULT_ACCOUNTS_URL,
    ),
    apiVersion: env.ZOHO_BOOKS_API_VERSION?.trim() || DEFAULT_API_VERSION,
    itemName: env.ZOHO_HOSTING_ITEM_NAME?.trim() || DEFAULT_ITEM_NAME,
    invoiceTemplateId: env.ZOHO_INVOICE_TEMPLATE_ID?.trim() || undefined,
    estimateTemplateId: env.ZOHO_ESTIMATE_TEMPLATE_ID?.trim() || undefined,
  };
}

function zohoError(message: string, status?: number) {
  const suffix = status ? ` (HTTP ${status})` : "";
  return new Error(`Zoho Books: ${message}${suffix}`);
}

export class ZohoBooksInvoiceProvider implements InvoiceProvider {
  private accessToken: AccessToken | null = null;
  private accessTokenRefresh: Promise<AccessToken> | null = null;

  constructor(
    private readonly config: ZohoBooksConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  private async refreshAccessToken(): Promise<AccessToken> {
    const body = new URLSearchParams({
      refresh_token: this.config.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "refresh_token",
    });

    const response = await this.fetchImpl(
      `${this.config.accountsUrl}/oauth/v2/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as ZohoTokenResponse;

    if (!response.ok || !payload.access_token || !payload.api_domain) {
      throw zohoError(
        payload.error || "Could not refresh the OAuth access token.",
        response.status,
      );
    }

    const expiresIn = payload.expires_in ?? 3600;
    this.accessToken = {
      value: payload.access_token,
      apiDomain: withoutTrailingSlash(payload.api_domain),
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return this.accessToken;
  }

  private async token() {
    if (
      this.accessToken &&
      this.accessToken.expiresAt - Date.now() > 60_000
    ) {
      return this.accessToken;
    }
    this.accessTokenRefresh ??= this.refreshAccessToken().finally(() => {
      this.accessTokenRefresh = null;
    });
    return this.accessTokenRefresh;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = {},
    query: Record<string, string> = {},
  ): Promise<T> {
    const token = await this.token();
    const params = new URLSearchParams({
      organization_id: this.config.organizationId,
      ...query,
    });
    const response = await this.fetchImpl(
      `${token.apiDomain}/books/${this.config.apiVersion}${path}?${params}`,
      {
        ...init,
        headers: {
          Authorization: `Zoho-oauthtoken ${token.value}`,
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as ZohoEnvelope & T;

    if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
      throw zohoError(
        payload.message || "The API request failed.",
        response.status,
      );
    }
    return payload;
  }

  private async resolveItemId() {
    const payload = await this.requestJson<{ items?: ZohoItem[] }>(
      "/items",
      {},
      { name: this.config.itemName },
    );
    const item = payload.items?.find(
      ({ name }) => name.trim().toLowerCase() === this.config.itemName.toLowerCase(),
    );

    if (!item) {
      throw zohoError(
        `Item "${this.config.itemName}" was not found. Create it in Zoho Books or change ZOHO_HOSTING_ITEM_NAME.`,
      );
    }
    return String(item.item_id);
  }

  private async resolveContactId(input: CreateInvoiceInput) {
    if (input.externalCustomerId) {
      return input.externalCustomerId;
    }

    const existing = await this.requestJson<{ contacts?: ZohoContact[] }>(
      "/contacts",
      {},
      {
        company_name: input.clientName,
        contact_type: "customer",
      },
    );
    const exactContact = existing.contacts?.find(
      ({ company_name, contact_name }) =>
        (company_name || contact_name).trim().toLowerCase() ===
        input.clientName.trim().toLowerCase(),
    );
    if (exactContact) {
      return String(exactContact.contact_id);
    }

    const contactPersons = input.contact
      ? [
          {
            first_name: input.contact.name,
            email: input.contact.email,
            phone: input.contact.phone || undefined,
            is_primary_contact: true,
          },
        ]
      : undefined;
    const created = await this.requestJson<{ contact: ZohoContact }>(
      "/contacts",
      {
        method: "POST",
        body: JSON.stringify({
          contact_name: input.billingName,
          company_name: input.clientName,
          contact_type: "customer",
          customer_sub_type: "business",
          currency_code: input.currency,
          billing_address:
            input.billingAddress || input.country
              ? {
                  attention: input.billingName,
                  address: input.billingAddress || undefined,
                  country: input.country || undefined,
                }
              : undefined,
          contact_persons: contactPersons,
        }),
      },
    );
    return String(created.contact.contact_id);
  }

  private async resolveDocumentContext(input: CreateInvoiceInput) {
    const [itemId, contactId] = await Promise.all([
      this.resolveItemId(),
      this.resolveContactId(input),
    ]);
    return { itemId, contactId };
  }

  private lineItems(input: CreateInvoiceInput, itemId: string) {
    return [
      {
        item_id: itemId,
        name: this.config.itemName,
        description: input.description,
        quantity: input.quantity,
        rate: Number(input.unitPrice),
      },
    ];
  }

  private async findEstimateByReference(referenceNumber: string) {
    const payload = await this.requestJson<{ estimates?: ZohoEstimate[] }>(
      "/estimates",
      {},
      { reference_number: referenceNumber },
    );
    return (
      payload.estimates?.find(
        (estimate) => estimate.reference_number === referenceNumber,
      ) ?? null
    );
  }

  private async findInvoiceByReference(referenceNumber: string) {
    const payload = await this.requestJson<{ invoices?: ZohoInvoice[] }>(
      "/invoices",
      {},
      { reference_number: referenceNumber },
    );
    return (
      payload.invoices?.find(
        (invoice) => invoice.reference_number === referenceNumber,
      ) ?? null
    );
  }

  async createInvoice(
    input: CreateInvoiceInput,
  ): Promise<CreateInvoiceResult> {
    const { itemId, contactId } = await this.resolveDocumentContext(input);
    const paymentTerms = Math.max(
      0,
      Math.round(
        (Date.parse(`${input.dueDate}T00:00:00Z`) -
          Date.parse(`${input.issueDate}T00:00:00Z`)) /
          86_400_000,
      ),
    );
    const payload = await this.requestJson<{ invoice: ZohoInvoice }>(
      "/invoices",
      {
        method: "POST",
        body: JSON.stringify({
          customer_id: contactId,
          date: input.issueDate,
          due_date: input.dueDate,
          payment_terms: paymentTerms,
          payment_terms_label: "Custom",
          reference_number: input.referenceNumber,
          template_id: this.config.invoiceTemplateId,
          line_items: this.lineItems(input, itemId),
        }),
      },
    );

    return {
      provider: ZOHO_PROVIDER,
      externalInvoiceId: String(payload.invoice.invoice_id),
      externalCustomerId: contactId,
      invoiceNumber: payload.invoice.invoice_number,
      invoiceUrl: payload.invoice.invoice_url ?? null,
    };
  }

  async createQuotationAndInvoice(
    input: CreateInvoiceInput,
  ): Promise<CreateQuotationAndInvoiceResult> {
    const { itemId, contactId } = await this.resolveDocumentContext(input);
    const quotationReference = `${input.referenceNumber}:quotation`;

    let quotation = await this.findEstimateByReference(quotationReference);
    if (!quotation) {
      const payload = await this.requestJson<{ estimate: ZohoEstimate }>(
        "/estimates",
        {
          method: "POST",
          body: JSON.stringify({
            customer_id: contactId,
            date: input.issueDate,
            expiry_date: input.dueDate,
            reference_number: quotationReference,
            template_id: this.config.estimateTemplateId,
            line_items: this.lineItems(input, itemId),
          }),
        },
      );
      quotation = payload.estimate;
    }

    let invoice = await this.findInvoiceByReference(input.referenceNumber);
    if (!invoice) {
      const paymentTerms = Math.max(
        0,
        Math.round(
          (Date.parse(`${input.dueDate}T00:00:00Z`) -
            Date.parse(`${input.issueDate}T00:00:00Z`)) /
            86_400_000,
        ),
      );
      const payload = await this.requestJson<{ invoice: ZohoInvoice }>(
        "/invoices",
        {
          method: "POST",
          body: JSON.stringify({
            customer_id: contactId,
            date: input.issueDate,
            due_date: input.dueDate,
            payment_terms: paymentTerms,
            payment_terms_label: "Custom",
            reference_number: input.referenceNumber,
            invoiced_estimate_id: String(quotation.estimate_id),
            template_id: this.config.invoiceTemplateId,
            line_items: this.lineItems(input, itemId),
          }),
        },
      );
      invoice = payload.invoice;
    }

    return {
      provider: ZOHO_PROVIDER,
      externalInvoiceId: String(invoice.invoice_id),
      externalCustomerId: contactId,
      invoiceNumber: invoice.invoice_number,
      invoiceUrl: invoice.invoice_url ?? null,
      externalQuotationId: String(quotation.estimate_id),
      quotationNumber: quotation.estimate_number,
      quotationUrl: quotation.estimate_url ?? null,
    };
  }

  async getInvoicePdf(externalInvoiceId: string): Promise<ArrayBuffer> {
    return this.getDocumentPdf(
      "invoices",
      externalInvoiceId,
      "invoice",
    );
  }

  async getQuotationPdf(externalQuotationId: string): Promise<ArrayBuffer> {
    return this.getDocumentPdf(
      "estimates",
      externalQuotationId,
      "quotation",
    );
  }

  private async getDocumentPdf(
    documentPath: "invoices" | "estimates",
    externalDocumentId: string,
    label: "invoice" | "quotation",
  ): Promise<ArrayBuffer> {
    const token = await this.token();
    const params = new URLSearchParams({
      organization_id: this.config.organizationId,
    });
    const response = await this.fetchImpl(
      `${token.apiDomain}/books/${this.config.apiVersion}/${documentPath}/${encodeURIComponent(externalDocumentId)}?${params}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${token.value}`,
          Accept: "application/pdf",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw zohoError(`Could not download the ${label} PDF.`, response.status);
    }
    return response.arrayBuffer();
  }
}

export { ZOHO_PROVIDER };
