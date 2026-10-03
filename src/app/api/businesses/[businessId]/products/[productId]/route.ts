import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getProduct } from "@/services/product/get-product.service";

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