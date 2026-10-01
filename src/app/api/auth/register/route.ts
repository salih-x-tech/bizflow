import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { registerUser } from "@/services/auth/register.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);

    await consumeRateLimit({
      scope: "auth:register:global",
      identifier: "all",
      limit: 100,
      windowMs: 60 * 1000,
    });

    const input = await readJsonBody(request);
    const user = await registerUser(input);

    return apiSuccess({ user }, 201);
  } catch (error: unknown) {
    return apiError(error);
  }
}