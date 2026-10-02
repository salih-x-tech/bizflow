import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
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