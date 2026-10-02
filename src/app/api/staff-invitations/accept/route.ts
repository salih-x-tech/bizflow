import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { acceptStaffInvitation } from "@/services/staff/accept-invitation.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();

    await consumeRateLimit({
      scope: "staff:accept-invitation:user",
      identifier: user.id,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const input = await readJsonBody(request);
    const result = await acceptStaffInvitation(user.id, input);

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}