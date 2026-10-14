import { Panel, Badge, utc } from "@/components/workspace/data-view";
import { MutationForm, MutationButton, type Field } from "@/components/workspace/mutation-form";
import { listStaff } from "@/services/staff/list-staff.service";
import { listStaffInvitations } from "@/services/staff/list-invitations.service";
import { BUSINESS_PERMISSIONS } from "@/lib/permissions";
import { pageAccess, pageError, type WorkspaceProps } from "@/lib/workspace-page";
const permissions: Field = { name: "permissions", label: "Permissions", multiple: true, options: BUSINESS_PERMISSIONS.map((permission) => ({ value: permission, label: permission.replace(/^can/, "").replace(/([A-Z])/g, " $1").trim() })) };
export default async function Page({ params }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user } = await pageAccess(businessId, "owner");
            const [staff, invitations] = await Promise.all([listStaff(user.id, businessId), listStaffInvitations(user.id, businessId)]);
            const base = `/api/businesses/${businessId}/staff`;
            return { ok: true as const, businessId, user, staff, invitations, base };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { staff, invitations, base } = loaded;
    return <div className="space-y-6"><Panel title="Invite staff"><p className="text-muted">Choose only the access needed. An invitation grants access after the recipient signs in with the invited email and accepts. Email server acceptance does not guarantee inbox delivery.</p><MutationForm url={`${base}/invitations`} label="Send invitation" fields={[{ name: "email", label: "Recipient email", type: "email", required: true, maxLength: 254 }, permissions]}/></Panel><Panel title="Staff members">{!staff.length && <p className="text-muted">No staff members yet. Invite your team above.</p>}{staff.map((member) => <article key={member.id} className="space-y-4 rounded-xl border border-white/10 p-5"><h2 className="break-words font-semibold">{member.user?.name || "Unavailable account"} · {member.user?.email}</h2><Badge value={member.status}/>{member.status === "Active" && <><MutationForm url={`${base}/${member.id}`} method="PATCH" label="Save permissions" fields={[{ ...permissions, value: member.permissions.join(",") }]}/><MutationButton url={`${base}/${member.id}`} method="DELETE" label="Remove staff" confirmation="This immediately revokes this member’s access to this business."/></>}</article>)}</Panel><Panel title="Invitations">{!invitations.length && <p className="text-muted">No invitations have been created.</p>}{invitations.map((invitation) => <article key={invitation.id} className="space-y-3 rounded-xl border border-white/10 p-5"><h2 className="break-words font-semibold">{invitation.email}</h2><Badge value={invitation.status}/><p className="text-muted text-sm">Expires {utc(invitation.expiresAt)}</p><p className="text-muted text-sm">{invitation.permissions.map((value) => value.replace(/^can/, "").replace(/([A-Z])/g, " $1").trim()).join(", ") || "No operational permissions"}</p>{invitation.status === "Pending" && <MutationButton url={`${base}/invitations/${invitation.id}`} method="PATCH" label="Revoke invitation" confirmation="The emailed link will no longer grant access. You can create a replacement invitation afterward."/>}</article>)}</Panel></div>;
}
