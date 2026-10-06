import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { getInventoryReport } from "@/services/report/inventory-report.service";
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

    let report;

    switch (query.type) {
      case "inventory":
        report = await getInventoryReport(
          user.id,
          businessId,
          query,
        );
        break;

      case "orders":
        report = await getOrderActivityReport(
          user.id,
          businessId,
          query,
        );
        break;

      default:
        report = await getSalesReport(
          user.id,
          businessId,
          query,
        );
        break;
    }

    return apiSuccess({ report });
    } catch (error: unknown) {
    console.error("Report generation error:", error);
    return apiError(error);
  }
}