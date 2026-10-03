import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getProduct } from "@/services/product/get-product.service";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { updateProduct } from "@/services/product/update-product.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    businessId: string;
    productId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId, productId } = await context.params;

    const product = await getProduct(
      user.id,
      businessId,
      productId,
    );

    return apiSuccess({ product });
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
    const { businessId, productId } = await context.params;

    await consumeRateLimit({
      scope: "product:update",
      identifier: user.id,
      limit: 60,
      windowMs: 60_000,
    });

    const input = await readJsonBody(request);

    const product = await updateProduct(
      user.id,
      businessId,
      productId,
      input,
    );

    return apiSuccess({ product });
  } catch (error: unknown) {
    return apiError(error);
  }
}


export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, productId } = await context.params;

    await consumeRateLimit({
      scope: "product:archive",
      identifier: user.id,
      limit: 30,
      windowMs: 60_000,
    });

    const product = await updateProduct(
      user.id,
      businessId,
      productId,
      {
        status: "Archived",
      },
    );

    return apiSuccess({ product });
  } catch (error: unknown) {
    return apiError(error);
  }
}