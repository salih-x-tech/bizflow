import "server-only";
import { connectDB } from "@/lib/db/connect";
import { createAuthToken, hashToken } from "@/lib/auth/tokens";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { forgotPasswordSchema } from "@/lib/validation/password-reset";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { AuditLog } from "@/models/AuditLog";

export async function forgotPassword(input: unknown) {
  const { email } = forgotPasswordSchema.parse(input);
  await consumeRateLimit({
    scope: "auth:forgot-password:email",
    identifier: hashToken(email),
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  const connection = await connectDB();
  const user = await User.findOne({ email, status: "Active" }).select("_id").lean();
  if (user) {
    try {
      const appUrl = new URL(process.env.APP_URL || "");
      if (!["http:", "https:"].includes(appUrl.protocol) || appUrl.username || appUrl.password
        || (process.env.NODE_ENV === "production" && appUrl.protocol !== "https:")) {
        throw new Error("Invalid application URL");
      }
      const url = new URL("/reset-password", appUrl);
      const { token, tokenHash } = createAuthToken();
      await Promise.all([PasswordResetToken.init(), AuditLog.init()]);
      await connection.connection.transaction(async (session) => {
        await PasswordResetToken.create([{
          userId: user._id,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        }], { session });
        await AuditLog.create([{
          scope: "Account",
          userId: user._id,
          action: "PASSWORD_RESET_REQUESTED",
          entityType: "User",
          entityId: user._id,
          details: {},
        }], { session });
      });
      url.searchParams.set("token", token);
      await sendEmail({
        to: email,
        subject: "Reset your BizFlow password",
        text: `Reset your password within 30 minutes: ${url.toString()}\nIf you did not request this, ignore this email.`,
      });
    } catch {
      // Per-account storage or delivery failures must not reveal account existence.
      // Do not log provider errors, which can contain the raw emailed link.
    }
  }
  return {
    message: "If an active account matches this email, a password reset link will be sent. Check your inbox and spam folder.",
  };
}
