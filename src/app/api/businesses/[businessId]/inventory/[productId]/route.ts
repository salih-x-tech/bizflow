import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { updateInventory } from "@/services/inventory/update-inventory.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    businessId: string;
    productId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, productId } = await context.params;

    await consumeRateLimit({
      scope: "inventory:update",
      identifier: user.id,
      limit: 60,
      windowMs: 60_000,
    });

    const input = await readJsonBody(request);

    const inventory = await updateInventory(
      user.id,
      businessId,
      productId,
      input,
    );

    return apiSuccess({ inventory });
  } catch (error: unknown) {
    return apiError(error);
  }
}