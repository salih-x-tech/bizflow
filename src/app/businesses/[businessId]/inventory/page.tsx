import Link from "next/link";
import { Panel, Filters, DataTable, Pager, Badge } from "@/components/workspace/data-view";
import { listInventory } from "@/services/inventory/list-inventory.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user } = await pageAccess(businessId, "canManageInventory");
            const query = queryValues(await searchParams, ["search", "status", "lowStock", "page"]);
            const result = await listInventory(user.id, businessId, query);
            return { ok: true as const, businessId, user, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, query, result } = loaded;
    return <Panel title="Inventory" action={<Link className="secondary-button" href={`/businesses/${businessId}/inventory/history`}>Adjustment history</Link>}><Filters query={query} fields={[{ name: "search", label: "Search products" }, { name: "status", label: "Product status", options: ["Active", "Archived", "All"] }, { name: "lowStock", label: "Low stock", options: ["", "true", "false"] }]}/><DataTable headings={["Product", "Stock", "Threshold", "Status"]} rows={result.inventory.map((item) => [<Link key={item.productId} className="text-indigo-300" href={`/businesses/${businessId}/inventory/${item.productId}`}>{item.name}</Link>, item.quantity, item.lowStockThreshold ?? "Not set", <Badge key="status" value={item.lowStock ? "Low stock" : item.status || "Active"}/>])}/><Pager pagination={result.pagination} query={query}/></Panel>;
}
