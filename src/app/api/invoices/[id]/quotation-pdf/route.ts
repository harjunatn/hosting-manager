import { getZohoBooksInvoiceProvider } from "@/integrations/invoice/get-invoice-provider";
import { ZOHO_PROVIDER } from "@/integrations/invoice/zoho-books-invoice-provider";
import { getCurrentUser } from "@/modules/auth/session";
import { getInvoice } from "@/modules/clients/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await getInvoice(id);
  if (
    !invoice ||
    (user.role === "CLIENT" && invoice.client_id !== user.clientId)
  ) {
    return Response.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.provider !== ZOHO_PROVIDER || !invoice.external_quotation_id) {
    return Response.json(
      { error: "An official Zoho quotation is not available." },
      { status: 404 },
    );
  }

  const provider = getZohoBooksInvoiceProvider();
  if (!provider?.getQuotationPdf) {
    return Response.json(
      { error: "Zoho Books is not configured." },
      { status: 503 },
    );
  }

  try {
    const pdf = await provider.getQuotationPdf(invoice.external_quotation_id);
    const filename = (invoice.quotation_number ?? "quotation").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    return new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Could not download Zoho quotation PDF", error);
    return Response.json(
      { error: "Could not download the quotation PDF from Zoho Books." },
      { status: 502 },
    );
  }
}
