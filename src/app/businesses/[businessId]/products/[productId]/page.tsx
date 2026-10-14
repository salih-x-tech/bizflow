import Link from "next/link";
import { Panel, Badge } from "@/components/workspace/data-view";
import { CatalogForm } from "@/components/workspace/catalog-form";
import { MutationButton } from "@/components/workspace/mutation-form";
import { getProduct } from "@/services/product/get-product.service";
import { pageAccess, pageError } from "@/lib/workspace-page";
export default async function Page({ params }: {
    params: Promise<{
        businessId: string;
        productId: string;
    }>;
}) {
    const loaded = await (async () => {
        try {
            const { businessId, productId } = await params;
            const { user, business } = await pageAccess(businessId, "canManageProducts");
            const item = await getProduct(user.id, businessId, productId);
            return { ok: true as const, businessId, productId, user, business, item };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, productId, business, item } = loaded;
    return <Panel title={item.name} action={<Link className="secondary-button" href={`/businesses/${businessId}/products`}>All products</Link>}><Badge value={item.status}/><CatalogForm businessId={businessId} currency={business.currency} product={item}/><MutationButton url={`/api/businesses/${businessId}/products/${productId}`} method={item.status === "Active" ? "DELETE" : "PATCH"} body={item.status === "Active" ? undefined : { status: "Active" }} label={item.status === "Active" ? "Archive product" : "Restore product"} confirmation={item.status === "Active" ? "The product remains in historical orders but cannot be selected for new orders." : undefined}/></Panel>;
}
