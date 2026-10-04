import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { updateOrderStatusSchema } from "@/lib/validation/order";
import { cancelOrder } from "@/services/order/cancel-order.service";
import { completeOrder } from "@/services/order/complete-order.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    businessId: string;
    orderId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, orderId } = await context.params;

    await consumeRateLimit({
      scope: "order:status",
      identifier: user.id,
      limit: 30,
      windowMs: 60_000,
    });

    const input = await readJsonBody(request);
    const data = updateOrderStatusSchema.parse(input);

    const result = data.status === "Completed"
      ? await completeOrder(
          user.id,
          businessId,
          orderId,
        )
      : await cancelOrder(
          user.id,
          businessId,
          orderId,
        );

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}