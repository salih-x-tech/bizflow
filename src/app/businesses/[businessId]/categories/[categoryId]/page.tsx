import Link from "next/link";
import { Panel, Badge } from "@/components/workspace/data-view";
import { MutationForm, MutationButton } from "@/components/workspace/mutation-form";
import { getCategory } from "@/services/category/get-category.service";
import { pageAccess, pageError } from "@/lib/workspace-page";
export default async function Page({ params }: {
    params: Promise<{
        businessId: string;
        categoryId: string;
    }>;
}) {
    const loaded = await (async () => {
        try {
            const { businessId, categoryId } = await params;
            const { user } = await pageAccess(businessId, "canManageCategories");
            const item = await getCategory(user.id, businessId, categoryId);
            const url = `/api/businesses/${businessId}/categories/${categoryId}`;
            return { ok: true as const, businessId, categoryId, user, item, url };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, item, url } = loaded;
    return <Panel title={item.name} action={<Link className="secondary-button" href={`/businesses/${businessId}/categories`}>All categories</Link>}><Badge value={item.status || "Active"}/><MutationForm url={url} method="PATCH" fields={[{ name: "name", label: "Name", required: true, maxLength: 100, value: item.name }, { name: "description", label: "Description (optional)", type: "textarea", maxLength: 1000, value: item.description }]}/><MutationButton url={url} method={item.status === "Active" ? "DELETE" : "PATCH"} body={item.status === "Active" ? undefined : { status: "Active" }} label={item.status === "Active" ? "Archive category" : "Restore category"} confirmation={item.status === "Active" ? "Existing product relationships remain. This category will no longer be offered for new assignments." : undefined}/></Panel>;
}
