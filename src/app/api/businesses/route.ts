import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { createBusiness } from "@/services/business/create-business.service";
import { listBusinesses } from "@/services/business/list-businesses.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const businesses = await listBusinesses(user.id);

    return apiSuccess({
      businesses,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);

    const user = await requireUser();

    await consumeRateLimit({
      scope: "business:create:user",
      identifier: user.id,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const input = await readJsonBody(request);
    const business = await createBusiness(user.id, input);

    return apiSuccess(
      {
        business,
      },
      201,
    );
  } catch (error: unknown) {
    return apiError(error);
  }
}