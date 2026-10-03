import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { createProduct } from "@/services/product/create-product.service";
import { listProducts } from "@/services/product/list-products.service";

export const runtime = "nodejs";

type ProductRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(
  request: Request,
  context: ProductRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const query = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const result = await listProducts(
      user.id,
      businessId,
      query,
    );

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: ProductRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId } = await context.params;

    await consumeRateLimit({
      scope: "product:create:user",
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);

    const product = await createProduct(
      user.id,
      businessId,
      input,
    );

    return apiSuccess(
      {
        product,
      },
      201,
    );
      } catch (error: unknown) {
    return apiError(error);
  }
}