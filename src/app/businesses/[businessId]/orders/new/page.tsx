import { Panel } from "@/components/workspace/data-view";
import { OrderForm } from "@/components/workspace/order-form";
import { pageAccess, pageError, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { business } = await pageAccess(businessId, "canManageOrders");
            return { ok: true as const, businessId, business };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, business } = loaded;
    return <Panel title="New pending order"><OrderForm businessId={businessId} currency={business.currency}/></Panel>;
}
