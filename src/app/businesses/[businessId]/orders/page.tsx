import { LookupFilter } from "@/components/workspace/lookup-filter";
import Link from "next/link";
import { Panel, Filters, DataTable, Pager, Badge, money, utc } from "@/components/workspace/data-view";
import { listOrders } from "@/services/order/list-orders.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user, business } = await pageAccess(businessId, "canManageOrders");
            const query = queryValues(await searchParams, ["customerId", "status", "page"]);
            const result = await listOrders(user.id, businessId, query);
            return { ok: true as const, businessId, user, business, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, business, query, result } = loaded;
    return <Panel title="Orders" action={<Link className="primary-button" href={`/businesses/${businessId}/orders/new`}>Create order</Link>}><Filters query={query} fields={[{ name: "customerId", label: "Customer ID" }, { name: "status", label: "Status", options: ["All", "Pending", "Completed", "Cancelled"] }]}/><LookupFilter businessId={businessId} collection="customers" field="customerId" label="Browse active customers to filter" query={query} /><DataTable headings={["Order", "Created", "Items", "Total", "Status"]} rows={result.orders.map((item) => [<Link key={item.id} className="text-indigo-300" href={`/businesses/${businessId}/orders/${item.id}`}>{item.id.slice(-8)}</Link>, utc(item.createdAt), item.items.map((row) => `${row.productNameSnapshot} × ${row.quantity}`).join(", "), money(item.totalAmount, business.currency), <Badge key="status" value={item.status}/>])}/><Pager pagination={result.pagination} query={query}/></Panel>;
}
