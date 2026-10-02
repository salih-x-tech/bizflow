import "server-only";
import { sendEmail } from "@/lib/email/send";

interface StaffInvitationEmail {
  email: string;
  businessName: string;
  token: string;
  expiresAt: Date;
}

export async function sendStaffInvitationEmail(
  invitation: StaffInvitationEmail,
): Promise<void> {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is missing.");
  }

  const baseUrl = new URL(appUrl);

  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new Error("APP_URL is invalid.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    baseUrl.protocol !== "https:"
  ) {
    throw new Error("APP_URL must use HTTPS in production.");
  }

  const invitationUrl = new URL(
    "/staff-invitations/accept",
    baseUrl,
  );

  invitationUrl.searchParams.set("token", invitation.token);

  await sendEmail({
    to: invitation.email,
    subject: "You have been invited to a business on BizFlow",
    text: [
      `You have been invited to join ${invitation.businessName} on BizFlow.`,
      "",
      "Sign in or register using this email address:",
      invitation.email,
      "",
      "Accept your invitation:",
      invitationUrl.toString(),
      "",
      `This invitation expires at ${invitation.expiresAt.toISOString()} (UTC).`,
      "",
      "If you were not expecting this invitation, you can ignore this email.",
    ].join("\n"),
  });
}