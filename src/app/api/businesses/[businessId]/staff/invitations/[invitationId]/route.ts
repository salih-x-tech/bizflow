import { assertTrustedOrigin } from "@/lib/api/origin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { revokeStaffInvitation } from "@/services/staff/revoke-invitation.service";

export const runtime = "nodejs";

type RevokeInvitationRouteContext = {
  params: Promise<{
    businessId: string;
    invitationId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RevokeInvitationRouteContext,
) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();
    const { businessId, invitationId } = await context.params;

    await consumeRateLimit({
      scope: "staff:revoke-invitation:user",
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 1000,
    });

    const invitation = await revokeStaffInvitation(
      user.id,
      businessId,
      invitationId,
    );

    return apiSuccess({
      invitation,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}