import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { listAuditLogs } from "@/services/audit/list-audit-logs.service";

export const runtime = "nodejs";

type AuditLogsRouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

export async function GET(
  request: Request,
  context: AuditLogsRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const query = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );

    const result = await listAuditLogs(
      user.id,
      businessId,
      query,
    );

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}