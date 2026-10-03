import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getCategory } from "@/services/category/get-category.service";
import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { updateCategory } from "@/services/category/update-category.service";


export const runtime = "nodejs";

type CategoryDetailRouteContext = {
  params: Promise<{
    businessId: string;
    categoryId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: CategoryDetailRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId, categoryId } = await context.params;

    const category = await getCategory(
      user.id,
      businessId,
      categoryId,
    );

    return apiSuccess({
      category,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: CategoryDetailRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, categoryId } = await context.params;

    await consumeRateLimit({
      scope: "category:update:user",
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);

    const category = await updateCategory(
      user.id,
      businessId,
      categoryId,
      input,
    );

    return apiSuccess({
      category,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: CategoryDetailRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, categoryId } = await context.params;

    await consumeRateLimit({
      scope: "category:archive:user",
      identifier: user.id,
      limit: 30,
      windowMs: 60 * 1000,
    });

    const category = await updateCategory(
      user.id,
      businessId,
      categoryId,
      {
        status: "Archived",
      },
    );

    return apiSuccess({
      category,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}