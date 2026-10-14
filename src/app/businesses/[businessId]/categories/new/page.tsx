import { Panel } from "@/components/workspace/data-view";
import { MutationForm } from "@/components/workspace/mutation-form";
import { pageAccess, pageError, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            await pageAccess(businessId, "canManageCategories");
            return { ok: true as const, businessId };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId } = loaded;
    return <Panel title="New category"><MutationForm url={`/api/businesses/${businessId}/categories`} redirectTo={`/businesses/${businessId}/categories`} label="Create category" fields={[{ name: "name", label: "Name", required: true, maxLength: 100 }, { name: "description", label: "Description (optional)", type: "textarea", maxLength: 1000 }]}/></Panel>;
}
