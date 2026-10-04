import { apiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getInvoice } from "@/services/invoice/get-invoice.service";
import { renderInvoiceHtml } from "@/services/invoice/render-invoice-html.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    businessId: string;
    invoiceId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId, invoiceId } = await context.params;

    const invoice = await getInvoice(
      user.id,
      businessId,
      invoiceId,
    );

    const html = renderInvoiceHtml(invoice);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": [
          "default-src 'none'",
          "style-src 'unsafe-inline'",
          "script-src 'none'",
          "base-uri 'none'",
          "frame-ancestors 'none'",
          "form-action 'none'",
        ].join("; "),
      },
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}