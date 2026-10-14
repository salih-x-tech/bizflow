import Link from "next/link";
import { Panel, Filters, DataTable, Pager, Badge } from "@/components/workspace/data-view";
import { listCategories } from "@/services/category/list-categories.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user } = await pageAccess(businessId, "canManageCategories");
            const query = queryValues(await searchParams, ["search", "status", "page"]);
            const result = await listCategories(user.id, businessId, query);
            return { ok: true as const, businessId, user, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, query, result } = loaded;
    return <Panel title="Categories" action={<Link className="primary-button" href={`/businesses/${businessId}/categories/new`}>Add category</Link>}><Filters query={query} fields={[{ name: "search", label: "Search names" }, { name: "status", label: "Status", options: ["Active", "Archived", "All"] }]}/><DataTable headings={["Name", "Description", "Status"]} rows={result.categories.map((item) => [<Link key={item.id} className="text-indigo-300" href={`/businesses/${businessId}/categories/${item.id}`}>{item.name}</Link>, item.description || "—", <Badge key="status" value={item.status || "Active"}/>])}/><Pager pagination={result.pagination} query={query}/></Panel>;
}
