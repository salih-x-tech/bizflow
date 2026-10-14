import Link from "next/link";
import { Panel, Badge, DataTable, money, utc } from "@/components/workspace/data-view";
import { OrderForm } from "@/components/workspace/order-form";
import { MutationButton } from "@/components/workspace/mutation-form";
import { getOrder } from "@/services/order/get-order.service";
import { pageAccess, pageError } from "@/lib/workspace-page";
export default async function Page({ params }: {
    params: Promise<{
        businessId: string;
        orderId: string;
    }>;
}) {
    const loaded = await (async () => {
        try {
            const { businessId, orderId } = await params;
            const { user, business, membership } = await pageAccess(businessId, "canManageOrders");
            const order = await getOrder(user.id, businessId, orderId);
            const url = `/api/businesses/${businessId}/orders/${orderId}/status`;
            return { ok: true as const, businessId, orderId, user, business, membership, order, url };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, orderId, business, membership, order, url } = loaded;
    return <Panel title={`Order ${orderId.slice(-8)}`} action={<Link className="secondary-button" href={`/businesses/${businessId}/orders`}>All orders</Link>}><Badge value={order.status}/><p className="text-muted text-sm">Created {utc(order.createdAt)} · Customer {order.customerId}</p><DataTable headings={["Product snapshot", "Quantity", "Unit price", "Line total"]} rows={order.items.map((item) => [item.productNameSnapshot, item.quantity, money(item.unitPriceAtOrder, business.currency), money(item.lineTotal, business.currency)])}/><p className="text-xl font-semibold">Total: {money(order.totalAmount, business.currency)}</p>{order.status === "Pending" && <><OrderForm businessId={businessId} currency={business.currency} order={order}/><MutationButton url={url} body={{ status: "Completed" }} label="Complete order" confirmation="This deducts available stock and issues an immutable invoice in one transaction. The server will reject insufficient stock."/></>}{order.status !== "Cancelled" && <MutationButton url={url} body={{ status: "Cancelled" }} label="Cancel order" confirmation={order.status === "Completed" ? "This restores deducted stock and voids the invoice atomically. Cancellation cannot be undone." : "This cancels the pending order without changing stock. Cancellation cannot be undone."}/>}{(membership.role === "Owner" || membership.permissions.includes("canManageInvoices")) && order.status !== "Pending" && <Link className="text-indigo-300" href={`/businesses/${businessId}/invoices?orderId=${orderId}`}>View associated invoice</Link>}</Panel>;
}
