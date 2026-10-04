import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { listInventoryAdjustments } from "@/services/inventory/list-adjustments.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const query = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const result = await listInventoryAdjustments(
      user.id,
      businessId,
      query,
    );

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}