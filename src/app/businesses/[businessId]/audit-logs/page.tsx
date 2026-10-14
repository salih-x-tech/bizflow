import { Panel, Filters, DataTable, Pager, utc } from "@/components/workspace/data-view";
import { listAuditLogs } from "@/services/audit/list-audit-logs.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user } = await pageAccess(businessId, "owner");
            const query = queryValues(await searchParams, ["action", "entityType", "entityId", "from", "to", "page"]);
            const result = await listAuditLogs(user.id, businessId, query);
            return { ok: true as const, businessId, user, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { query, result } = loaded;
    return <Panel title="Audit history"><p className="text-muted text-sm">Read-only business events. Dates include the entire selected UTC days. Account authentication events are excluded.</p><Filters query={query} fields={[{ name: "action", label: "Action (exact event code)" }, { name: "entityType", label: "Entity type" }, { name: "entityId", label: "Entity ID" }, { name: "from", label: "From (UTC)", type: "date" }, { name: "to", label: "To (UTC)", type: "date" }]}/><DataTable headings={["Time", "Action", "Entity", "Actor", "Metadata"]} rows={result.auditLogs.map((item) => [utc(item.timestamp), item.action.replaceAll("_", " "), `${item.entityType} · ${item.entityId || "—"}`, item.userId || "—", <pre key="details" className="max-w-sm whitespace-pre-wrap break-words text-xs">{JSON.stringify(item.details, null, 2)}</pre>])}/><Pager pagination={result.pagination} query={query}/></Panel>;
}
