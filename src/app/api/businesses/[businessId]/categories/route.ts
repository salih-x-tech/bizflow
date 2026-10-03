import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { createCategory } from "@/services/category/create-category.service";
import { listCategories } from "@/services/category/list-categories.service";


export const runtime = "nodejs";

type CategoryRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(
  request: Request,
  context: CategoryRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId } = await context.params;

    await consumeRateLimit({
      scope: "category:create:user",
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);

    const category = await createCategory(
      user.id,
      businessId,
      input,
    );

    return apiSuccess(
      {
        category,
      },
      201,
    );
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function GET(
  request: Request,
  context: CategoryRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const query = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const result = await listCategories(
      user.id,
      businessId,
      query,
    );

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}