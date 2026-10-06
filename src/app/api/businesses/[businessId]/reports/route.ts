import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getOrderActivityReport } from "@/services/report/order-activity-report.service";
import { getSalesReport } from "@/services/report/sales-report.service";

export const runtime = "nodejs";

type ReportRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(
  request: Request,
  context: ReportRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const query = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const report =
      query.type === "orders"
        ? await getOrderActivityReport(
            user.id,
            businessId,
            query,
          )
        : await getSalesReport(
            user.id,
            businessId,
            query,
          );

    return apiSuccess({ report });
  } catch (error: unknown) {
    return apiError(error);
  }
}