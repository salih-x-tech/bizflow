import Link from "next/link";
import { Panel, utc } from "@/components/workspace/data-view";
import { MutationButton } from "@/components/workspace/mutation-form";
import { getMedia } from "@/services/media/get-media.service";
import { pageAccess, pageError } from "@/lib/workspace-page";
export default async function Page({ params }: {
    params: Promise<{
        businessId: string;
        mediaId: string;
    }>;
}) {
    const loaded = await (async () => {
        try {
            const { businessId, mediaId } = await params;
            const { user } = await pageAccess(businessId, "canManageProducts");
            const item = await getMedia(user.id, businessId, mediaId);
            return { ok: true as const, businessId, mediaId, user, item };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, mediaId, item } = loaded;
    return <Panel title="Image details" action={<Link className="secondary-button" href={`/businesses/${businessId}/media`}>Media gallery</Link>}><div className="aspect-video bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(item.url)})` }} role="img" aria-label="Uploaded product image"/><p className="text-muted">{item.mimeType} · Uploaded {utc(item.uploadedAt)}</p><p role="status" className="text-amber-200">{item.status === "Deleting" ? "Pending deletion — retry to finish cleanup. This image cannot be assigned to products." : "Available for product assignment"}</p><p className="break-all text-sm">Image ID: {item.id}</p><p className="text-muted text-sm">To delete a referenced image, remove it from every product first. A failed Cloudinary deletion keeps the image pending deletion; retry deletion to finish cleanup.</p><MutationButton url={`/api/businesses/${businessId}/media/${mediaId}`} method="DELETE" label="Delete image" confirmation="Permanently delete this image from the business and Cloudinary? Referenced images cannot be deleted." redirectTo={`/businesses/${businessId}/media`}/></Panel>;
}
