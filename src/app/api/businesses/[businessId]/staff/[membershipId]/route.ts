import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { updateStaffPermissions } from "@/services/staff/update-permissions.service";

export const runtime = "nodejs";

type StaffMembershipRouteContext = {
  params: Promise<{
    businessId: string;
    membershipId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: StaffMembershipRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, membershipId } = await context.params;

    await consumeRateLimit({
      scope: "staff:update-permissions:user",
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);

    const membership = await updateStaffPermissions(
      user.id,
      businessId,
      membershipId,
      input,
    );

    return apiSuccess({
      membership,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}