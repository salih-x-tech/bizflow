import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getProfile, updateProfile } from "@/services/auth/profile.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    return apiSuccess({ profile: await getProfile(user.id) });
  } catch (error: unknown) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    await consumeRateLimit({
      scope: "account:profile:update", identifier: user.id,
      limit: 60, windowMs: 60 * 1000,
    });
    return apiSuccess(await updateProfile(user.id, await readJsonBody(request)));
  } catch (error: unknown) { return apiError(error); }
}
