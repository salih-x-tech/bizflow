import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getOrder } from "@/services/order/get-order.service";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { updateOrder } from "@/services/order/update-order.service";


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

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, orderId } = await context.params;

    await consumeRateLimit({
      scope: "order:update",
      identifier: user.id,
      limit: 60,
      windowMs: 60_000,
    });

    const input = await readJsonBody(request);

    const order = await updateOrder(
      user.id,
      businessId,
      orderId,
      input,
    );

    return apiSuccess({ order });
  } catch (error: unknown) {
    return apiError(error);
  }
}