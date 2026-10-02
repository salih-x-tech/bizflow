import { assertTrustedOrigin } from "@/lib/api/origin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import {
  sendEmail,
  verifyEmailConnection,
} from "@/lib/email/send";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return apiError(
      new AppError("NOT_FOUND", "Route was not found.", 404),
    );
  }

  try {
    assertTrustedOrigin(request);

    const user = await requireUser();

    await consumeRateLimit({
      scope: "dev:email-check:user",
      identifier: user.id,
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });

    const recipient = process.env.SMTP_USER?.trim();

    if (!recipient) {
      throw new Error("Email test recipient is missing.");
    }

    await verifyEmailConnection();

    await sendEmail({
      to: recipient,
      subject: "BizFlow email setup test",
      text: [
        "Your BizFlow email connection is working.",
        "",
        "This is a development test email.",
      ].join("\n"),
    });

    return apiSuccess({
      message: "SMTP accepted the test email. Please check your inbox.",
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}