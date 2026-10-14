import { LookupFilter } from "@/components/workspace/lookup-filter";
import Link from "next/link";
import { Panel, Filters, DataTable, Pager, Badge, money } from "@/components/workspace/data-view";
import { listProducts } from "@/services/product/list-products.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user, business } = await pageAccess(businessId, "canManageProducts");
            const query = queryValues(await searchParams, ["search", "categoryId", "status", "page"]);
            const result = await listProducts(user.id, businessId, query);
            return { ok: true as const, businessId, user, business, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, business, query, result } = loaded;
    return <Panel title="Products" action={<Link className="primary-button" href={`/businesses/${businessId}/products/new`}>Add product</Link>}><Filters query={query} fields={[{ name: "search", label: "Search names" }, { name: "categoryId", label: "Category ID" }, { name: "status", label: "Status", options: ["Active", "Archived", "All"] }]}/><LookupFilter businessId={businessId} collection="categories" field="categoryId" label="Browse active categories to filter" query={query} /><DataTable headings={["Name", "Price", "Status"]} rows={result.products.map((item) => [<Link key={item.id} className="text-indigo-300" href={`/businesses/${businessId}/products/${item.id}`}>{item.name}</Link>, money(item.price ?? 0, business.currency), <Badge key="status" value={item.status}/>])}/><Pager pagination={result.pagination} query={query}/></Panel>;
}
