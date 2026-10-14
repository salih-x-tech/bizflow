"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RecordPicker, type PickRecord } from "@/components/workspace/record-picker";
import { requestMutation } from "@/components/workspace/mutation-form";
type OrderItem = { productId: string; productNameSnapshot: string; quantity: number; unitPriceAtOrder: number; lineTotal: number };
export function OrderForm({ businessId, currency, order }: { businessId: string; currency: string; order?: { id: string; customerId: string; items: OrderItem[] } }) {
  const router = useRouter();
  const base = `/api/businesses/${businessId}`;
  const [customer, setCustomer] = useState({ id: order?.customerId || "", name: order ? "Current customer" : "No customer selected" });
  const [items, setItems] = useState<OrderItem[]>(order?.items || []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availability, setAvailability] = useState("");
  async function addProduct(product: PickRecord) {
    if (items.some((item) => item.productId === product.id)) { setError("This product is already in the order. Change its quantity below."); return; }
    setItems([...items, { productId: product.id, productNameSnapshot: product.name, quantity: 1, unitPriceAtOrder: product.price ?? 0, lineTotal: product.price ?? 0 }]);
    setAvailability("");
    try { const response = await fetch(`${base}/inventory?productId=${product.id}`); const result = await response.json(); if (response.ok && result.success) setAvailability(`${product.name}: ${result.data.inventory[0]?.quantity ?? 0} units currently available. Stock is checked again on completion.`); else setAvailability("Availability could not be loaded. Stock is checked on completion."); } catch { setAvailability("Availability could not be loaded. Stock is checked on completion."); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setError(""); setSuccess("");
    if (!customer.id || !items.length || items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1)) { setError("Select a customer and at least one product with a positive whole quantity."); return; }
    setPending(true);
    try { const result = await requestMutation(`${base}/orders${order ? `/${order.id}` : ""}`, order ? "PATCH" : "POST", { customerId: customer.id, items: items.map(({ productId, quantity }) => ({ productId, quantity })) }); setSuccess("Pending order saved."); router.push(`/businesses/${businessId}/orders/${result.order.id}`); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} aria-busy={pending} className="space-y-5"><fieldset disabled={pending} className="space-y-5"><legend className="sr-only">Pending order details</legend><p className="text-muted text-sm">Prices shown for an existing order are saved snapshots. Saving items refreshes all item prices from the current catalog. Final totals come from the server.</p><p className="font-medium break-words">Customer: {customer.name} {customer.id && <span className="text-muted text-xs">({customer.id})</span>}</p><RecordPicker url={`${base}/customers`} collection="customers" label="Choose customer" onSelect={setCustomer} /><RecordPicker url={`${base}/products`} collection="products" label="Add active product" onSelect={(product) => void addProduct(product)} /><p role="status" className="text-muted text-sm">{availability}</p>{items.map((item, index) => <div key={item.productId} className="grid items-end gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-[1fr_100px_auto]"><div><p className="font-medium">{item.productNameSnapshot}</p><p className="text-muted text-sm">{currency} {item.unitPriceAtOrder.toFixed(2)} per unit</p></div><label className="text-sm">Quantity<input type="number" min={1} step="1" required value={item.quantity || ""} onChange={(event) => setItems(items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) } : row))} className="glass-input mt-2" /></label><button type="button" className="secondary-button" onClick={() => setItems(items.filter((_, rowIndex) => rowIndex !== index))}>Remove {item.productNameSnapshot}</button></div>)}</fieldset><p role="alert" className="form-error">{error}</p><p role="status" className="text-emerald-200">{success}</p><button disabled={pending} className="primary-button">{pending ? "Saving…" : order ? "Save pending order" : "Create pending order"}</button></form>;
}
