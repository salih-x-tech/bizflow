import Link from "next/link";
import { Panel, Filters, DataTable, Pager, Badge, money, utc } from "@/components/workspace/data-view";
import { listInvoices } from "@/services/invoice/list-invoices.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user } = await pageAccess(businessId, "canManageInvoices");
            const query = queryValues(await searchParams, ["invoiceNumber", "orderId", "status", "page"]);
            const result = await listInvoices(user.id, businessId, query);
            return { ok: true as const, businessId, user, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, query, result } = loaded;
    return <Panel title="Invoices"><p className="text-muted text-sm">Invoices are issued automatically when an order completes. Historical values are immutable.</p><Filters query={query} fields={[{ name: "invoiceNumber", label: "Invoice number (exact)" }, { name: "orderId", label: "Order ID" }, { name: "status", label: "Status", options: ["All", "Issued", "Voided"] }]}/><DataTable headings={["Invoice", "Customer", "Issued", "Total", "Status"]} rows={result.invoices.map((item) => [<Link key={item.id} className="text-indigo-300" href={`/businesses/${businessId}/invoices/${item.id}`}>{item.invoiceNumber}</Link>, item.customerName, utc(item.issuedAt), money(item.totalAmount, item.currency), <Badge key="status" value={item.status}/>])}/><Pager pagination={result.pagination} query={query}/></Panel>;
}
