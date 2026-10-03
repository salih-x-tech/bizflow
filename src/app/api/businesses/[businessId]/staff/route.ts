import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { listStaff } from "@/services/staff/list-staff.service";

export const runtime = "nodejs";

type StaffRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(
  _request: Request,
  context: StaffRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const staff = await listStaff(user.id, businessId);

    return apiSuccess({
      staff,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}