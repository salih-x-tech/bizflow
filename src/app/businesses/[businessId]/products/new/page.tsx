import { Panel } from "@/components/workspace/data-view";
import { CatalogForm } from "@/components/workspace/catalog-form";
import { pageAccess, pageError, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user, business } = await pageAccess(businessId, "canManageProducts");
            return { ok: true as const, businessId, user, business };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, business } = loaded;
    return <Panel title="New product"><CatalogForm businessId={businessId} currency={business.currency}/></Panel>;
}
