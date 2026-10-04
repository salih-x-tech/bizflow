import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getOrder } from "@/services/order/get-order.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    businessId: string;
    orderId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId, orderId } = await context.params;

    const order = await getOrder(
      user.id,
      businessId,
      orderId,
    );

    return apiSuccess({ order });
  } catch (error: unknown) {
    return apiError(error);
  }
}