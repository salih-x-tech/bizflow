import { Panel } from "@/components/workspace/data-view";
import { MutationForm } from "@/components/workspace/mutation-form";
import { pageAccess, pageError, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { business } = await pageAccess(businessId, "owner");
            return { ok: true as const, businessId, business };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, business } = loaded;
    return <Panel title="Business settings"><p className="text-muted">Currency: {business.currency}. Currency is fixed after business creation to preserve historical financial values.</p><MutationForm url={`/api/businesses/${businessId}`} method="PATCH" label="Save settings" fields={[{ name: "name", label: "Business name", required: true, maxLength: 100, value: business.name }, { name: "businessType", label: "Business type", required: true, maxLength: 100, value: business.businessType }, { name: "contactEmail", label: "Contact email (optional)", type: "email", maxLength: 254, value: business.contactEmail }, { name: "contactPhone", label: "Contact phone (optional)", type: "tel", maxLength: 30, value: business.contactPhone }, { name: "address", label: "Address (optional)", type: "textarea", maxLength: 500, value: business.address }]}/></Panel>;
}
