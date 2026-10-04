import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { createOrder } from "@/services/order/create-order.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId } = await context.params;

    await consumeRateLimit({
      scope: "order:create",
      identifier: user.id,
      limit: 60,
      windowMs: 60_000,
    });

    const input = await readJsonBody(request);

    const order = await createOrder(
      user.id,
      businessId,
      input,
    );

    return apiSuccess({ order }, 201);
  } catch (error: unknown) {
    return apiError(error);
  }
}