import Link from "next/link";
import { Panel } from "@/components/workspace/data-view";
import { MutationForm, MutationButton } from "@/components/workspace/mutation-form";
import { getProduct } from "@/services/product/get-product.service";
import { listInventory } from "@/services/inventory/list-inventory.service";
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
            const { user } = await pageAccess(businessId, "canManageInventory");
            const product = await getProduct(user.id, businessId, productId);
            const { inventory } = await listInventory(user.id, businessId, { productId, status: "All" });
            const item = inventory[0];
            const url = `/api/businesses/${businessId}/inventory/${productId}`;
            return { ok: true as const, businessId, productId, user, product, inventory, item, url };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, productId, product, item, url } = loaded;
    return <Panel title={`Stock · ${product.name}`} action={<Link className="secondary-button" href={`/businesses/${businessId}/inventory`}>All inventory</Link>}><p className="text-muted">Current stock: {item?.quantity ?? 0} · Low-stock threshold: {item?.lowStockThreshold ?? "Not set"}</p><MutationForm url={url} method="PATCH" label="Record adjustment" fields={[{ name: "type", label: "Adjustment", options: [{ value: "MANUAL_INCREASE", label: "Increase stock" }, { value: "MANUAL_DECREASE", label: "Decrease stock" }] }, { name: "quantity", label: "Quantity", type: "number", min: 1, step: "1", required: true }, { name: "reason", label: "Reason (optional)", type: "textarea", maxLength: 500 }]}/><MutationForm url={url} method="PATCH" label="Save threshold" fields={[{ name: "lowStockThreshold", label: "Low-stock threshold", type: "number", min: 0, step: "1", required: true, value: item?.lowStockThreshold }]}/><MutationButton url={url} body={{ lowStockThreshold: null }} label="Remove threshold"/><Link className="text-indigo-300" href={`/businesses/${businessId}/inventory/history?productId=${productId}`}>View adjustment history</Link></Panel>;
}
