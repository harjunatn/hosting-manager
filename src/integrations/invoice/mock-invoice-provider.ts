import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  InvoiceProvider,
} from "@/integrations/invoice/invoice-provider";

const counters = new Map<string, number>();

export class MockInvoiceProvider implements InvoiceProvider {
  constructor(private readonly prefix: string) {}

  async createInvoice(
    input: CreateInvoiceInput,
  ): Promise<CreateInvoiceResult> {
    if (!input.currency) {
      throw new Error("currency is required");
    }
    const next = (counters.get(this.prefix) ?? 0) + 1;
    counters.set(this.prefix, next);
    return {
      provider: this.prefix,
      externalInvoiceId: `${this.prefix}-${String(next).padStart(6, "0")}`,
    };
  }
}

export function resetMockInvoiceCounters() {
  counters.clear();
}
