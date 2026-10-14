import Link from "next/link";
import { Panel, Pager, utc } from "@/components/workspace/data-view";
import { MutationForm } from "@/components/workspace/mutation-form";
import { listMedia } from "@/services/media/list-media.service";
import { pageAccess, pageError, queryValues, type WorkspaceProps } from "@/lib/workspace-page";
export default async function Page({ params, searchParams }: WorkspaceProps) {
    const loaded = await (async () => {
        try {
            const { businessId } = await params;
            const { user } = await pageAccess(businessId, "canManageProducts");
            const query = queryValues(await searchParams, ["page"]);
            const result = await listMedia(user.id, businessId, { ...query, includeDeleting: "true" });
            return { ok: true as const, businessId, user, query, result };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, query, result } = loaded;
    return <div className="space-y-6"><Panel title="Upload image"><MutationForm url={`/api/businesses/${businessId}/media`} multipart label="Upload image" fields={[{ name: "file", label: "Image file", type: "file", required: true, hint: "JPEG, PNG, or WebP. Maximum 5 MiB; file content is validated by the server." }]}/></Panel><Panel title="Media gallery"><p className="text-muted text-sm">Assign images from a product’s edit page. Images pending deletion are excluded from selection.</p>{!result.media.length && <p className="text-muted">No images yet. Upload your first product image above.</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.media.map((item) => <Link key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5" href={`/businesses/${businessId}/media/${item.id}`}><div className="aspect-square bg-center bg-contain bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(item.url)})` }} role="img" aria-label={`Uploaded product image ${item.id.slice(-8)}`}/><div className="space-y-2 p-4"><p className="text-indigo-300">{item.status === "Deleting" ? "Pending deletion · " : "View image · "}{item.id.slice(-8)}</p><p className="text-muted text-xs">{item.mimeType} · {utc(item.uploadedAt)}</p></div></Link>)}</div><Pager pagination={result.pagination} query={query}/></Panel></div>;
}
