import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getInvoice } from "@/services/invoice/get-invoice.service";

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

    return apiSuccess({ invoice });
  } catch (error: unknown) {
    return apiError(error);
  }
}