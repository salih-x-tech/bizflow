import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { inviteStaff } from "@/services/staff/invite-staff.service";
import { listStaffInvitations } from "@/services/staff/list-invitations.service";

export const runtime = "nodejs";

type InvitationRouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(
  _request: Request,
  context: InvitationRouteContext,
) {
  try {
    const user = await requireUser();
    const { businessId } = await context.params;

    const invitations = await listStaffInvitations(
      user.id,
      businessId,
    );

    return apiSuccess({
      invitations,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: InvitationRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId } = await context.params;

    await consumeRateLimit({
      scope: "staff:invite:user",
      identifier: user.id,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const input = await readJsonBody(request);
    const result = await inviteStaff(user.id, businessId, input);

    return apiSuccess(result, 201);
  } catch (error: unknown) {
    return apiError(error);
  }
}