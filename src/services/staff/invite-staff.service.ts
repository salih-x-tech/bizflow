import "server-only";
import { requireBusinessOwner } from "@/services/business/business-owner.service";
import { createStaffInvitation } from "@/services/staff/create-invitation.service";
import { sendStaffInvitationEmail } from "@/services/staff/send-invitation-email.service";

export async function inviteStaff(
  authenticatedUserId: string,
  businessId: string,
  input: unknown,
) {
  const { business } = await requireBusinessOwner(
    authenticatedUserId,
    businessId,
  );

  const result = await createStaffInvitation(
    authenticatedUserId,
    businessId,
    input,
  );

  try {
    await sendStaffInvitationEmail({
      email: result.invitation.email,
      businessName: business.name,
      token: result.token,
      expiresAt: result.invitation.expiresAt,
    });
  } catch {
    return {
      invitation: result.invitation,
      emailDelivery: "Unconfirmed" as const,
      message:
        "Invitation saved, but email delivery could not be confirmed. Revoke this invitation before creating a replacement.",
    };
  }

  return {
    invitation: result.invitation,
    emailDelivery: "Accepted" as const,
    message: "Invitation saved and accepted by the email server.",
  };
}
