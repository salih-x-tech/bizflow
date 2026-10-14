import { assertTrustedOrigin } from "@/lib/api/origin";
import { readJsonBody } from "@/lib/api/request";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { forgotPassword } from "@/services/auth/forgot-password.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    await consumeRateLimit({ scope: "auth:forgot-password:global", identifier: "all", limit: 100, windowMs: 60 * 1000 });
    return apiSuccess(await forgotPassword(await readJsonBody(request)));
  } catch (error: unknown) { return apiError(error); }
}
