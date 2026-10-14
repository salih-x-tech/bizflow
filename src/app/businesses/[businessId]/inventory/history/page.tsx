import { Panel, Filters, DataTable, Pager, utc } from "@/components/workspace/data-view";
import { listInventoryAdjustments } from "@/services/inventory/list-adjustments.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user } = await pageAccess(businessId, "canManageInventory");
            const query = queryValues(await searchParams, ["productId", "type", "page"]);
            const result = await listInventoryAdjustments(user.id, businessId, query);
            return { ok: true as const, businessId, user, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { query, result } = loaded;
    return <Panel title="Adjustment history"><Filters query={query} fields={[{ name: "productId", label: "Product ID" }, { name: "type", label: "Type", options: ["", "INITIAL_STOCK", "MANUAL_INCREASE", "MANUAL_DECREASE", "ORDER_DEDUCTION", "ORDER_REVERSAL"] }]}/><DataTable headings={["Date", "Product", "Type", "Change", "Before → After", "Reason / Order", "Actor"]} rows={result.adjustments.map((item) => [utc(item.createdAt), item.productId, item.type.replaceAll("_", " "), item.quantityChange, `${item.previousQuantity} → ${item.newQuantity}`, item.reason || item.orderId || "—", item.userId])}/><Pager pagination={result.pagination} query={query}/></Panel>;
}
