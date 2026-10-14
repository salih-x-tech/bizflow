import Link from "next/link";
import { Panel, Badge, DataTable, money, utc } from "@/components/workspace/data-view";
import { getInvoice } from "@/services/invoice/get-invoice.service";
import { pageAccess, pageError } from "@/lib/workspace-page";
export default async function Page({ params }: {
    params: Promise<{
        businessId: string;
        invoiceId: string;
    }>;
}) {
    const loaded = await (async () => {
        try {
            const { businessId, invoiceId } = await params;
            const { user } = await pageAccess(businessId, "canManageInvoices");
            const invoice = await getInvoice(user.id, businessId, invoiceId);
            return { ok: true as const, businessId, invoiceId, user, invoice };
        }
        catch (error) {
            return { ok: false as const, error: pageError(error) };
        }
    })();
    if (!loaded.ok)
        return loaded.error;
    const { businessId, invoiceId, invoice } = loaded;
    return <Panel title={invoice.invoiceNumber} action={<a className="primary-button" href={`/api/businesses/${businessId}/invoices/${invoiceId}/print`} target="_blank" rel="noopener noreferrer">Open printable invoice</a>}><Badge value={invoice.status}/><p className="text-muted">Issued {utc(invoice.issuedAt)}{invoice.voidedAt && ` · Voided ${utc(invoice.voidedAt)}`}</p><div className="grid gap-5 sm:grid-cols-2">{[{ label: "Business snapshot", data: invoice.businessSnapshot }, { label: "Customer snapshot", data: invoice.customerSnapshot }].map(({ label, data }) => <section key={label} className="space-y-2 rounded-xl border border-white/10 p-5"><h2 className="text-muted text-sm">{label}</h2><p className="font-semibold">{data.name}</p><p className="break-words">{data.email}</p><p>{data.phone}</p><p className="whitespace-pre-wrap break-words">{data.address}</p></section>)}</div><DataTable headings={["Product snapshot", "Quantity", "Unit price", "Line total"]} rows={invoice.itemsSnapshot.map((item) => [item.productNameSnapshot, item.quantity, money(item.unitPriceAtOrder, invoice.currency), money(item.lineTotal, invoice.currency)])}/><p>Subtotal: {money(invoice.subtotal, invoice.currency)}</p><p className="text-xl font-semibold">Total: {money(invoice.totalAmount, invoice.currency)}</p>{invoice.status === "Voided" && <p className="form-error">Voided — this invoice is retained for historical reference.</p>}<Link className="secondary-button" href={`/businesses/${businessId}/invoices`}>All invoices</Link></Panel>;
}
