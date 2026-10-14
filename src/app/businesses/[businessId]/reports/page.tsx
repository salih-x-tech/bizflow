import { Panel, Filters, DataTable, Pager, money, utc } from "@/components/workspace/data-view";
import { getSalesReport } from "@/services/report/sales-report.service";
import { getInventoryReport } from "@/services/report/inventory-report.service";
import { getOrderActivityReport } from "@/services/report/order-activity-report.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user, business } = await pageAccess(businessId, "canViewReports");
            const today = new Date().toISOString().slice(0, 10);
            const query = { type: "sales", from: today.slice(0, 8) + "01", to: today, ...queryValues(await searchParams, ["type", "from", "to", "page"]) };
            const result = query.type === "inventory" ? await getInventoryReport(user.id, businessId, query) : query.type === "orders" ? await getOrderActivityReport(user.id, businessId, query) : await getSalesReport(user.id, businessId, query);
            return { ok: true as const, businessId, user, business, today, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { business, query, result } = loaded;
    return <Panel title="Reports"><Filters query={query} fields={[{ name: "type", label: "Report", options: ["sales", "inventory", "orders"] }, { name: "from", label: "From (UTC)", type: "date" }, { name: "to", label: "To (UTC)", type: "date" }]}/><p className="text-muted text-sm">Dates include each selected UTC day, from 00:00 on the first day to 00:00 after the last day.</p>{result.type === "sales" ? <><p className="text-lg font-semibold">Revenue: {money(result.summary.totalRevenue, result.summary.currency)} · {result.summary.invoiceCount} invoices</p><p className="text-muted text-sm">Issued invoices by issue date. Voided invoices are excluded.</p><DataTable headings={["Invoice", "Customer", "Issued", "Total"]} rows={result.invoices.map((item) => [item.invoiceNumber, item.customerName, utc(item.issuedAt), money(item.totalAmount, item.currency)])} empty="No issued invoices in this range. Complete orders to record sales."/></> : result.type === "orders" ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(result.summary).map(([key, value]) => <p key={key} className="rounded-xl border border-white/10 p-4"><span className="text-muted block text-sm">{key.replace(/([A-Z])/g, " $1")}</span><strong className="text-2xl">{value}</strong></p>)}</div><p className="text-muted text-sm">Orders selected by creation date; counts reflect their current status.</p><DataTable headings={["Order", "Created", "Status", "Total"]} rows={result.orders.map((item) => [item.id.slice(-8), utc(item.createdAt), item.status, money(item.totalAmount, business.currency)])}/></> : <><p className="text-muted text-sm">{result.turnoverBasis} A dash indicates turnover cannot be calculated for the range.</p><DataTable headings={["Product", "Opening", "Closing", "Current", "Net units sold", "Unit turnover", "Increase", "Decrease", "Reversals"]} rows={result.products.map((item) => [item.name, item.openingQuantity, item.closingQuantity, item.currentQuantity, item.netUnitsSold, item.unitTurnover ?? "—", item.manualIncrease, item.manualDecrease, item.orderReversals])}/></>}<Pager pagination={result.pagination} query={query}/></Panel>;
}
