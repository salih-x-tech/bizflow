"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecordPicker } from "@/components/workspace/record-picker";
import { requestMutation } from "@/components/workspace/mutation-form";
export function CatalogForm({ businessId, currency, product }: { businessId: string; currency: string; product?: { id: string; name: string; description?: string; price?: number; categoryId: string; mediaIds?: string[] } }) {
  const router = useRouter();
  const [category, setCategory] = useState({ id: product?.categoryId || "", name: product ? "Current category" : "No category selected" });
  const [mediaIds, setMediaIds] = useState<string[]>(product?.mediaIds || []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const base = `/api/businesses/${businessId}`;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setError(""); setSuccess("");
    if (!category.id) { setError("Select an active category."); return; }
    const data = new FormData(event.currentTarget);
    setPending(true);
    try { await requestMutation(`${base}/products${product ? `/${product.id}` : ""}`, product ? "PATCH" : "POST", { name: String(data.get("name") || "").trim(), description: String(data.get("description") || "").trim(), price: Number(data.get("price")), mediaIds, ...(!product || category.id !== product.categoryId ? { categoryId: category.id } : {}) }); setSuccess("Product saved."); if (!product) router.push(`/businesses/${businessId}/products`); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} aria-busy={pending} className="space-y-5"><p className="text-muted text-sm">Stock is managed in Inventory. New products start with zero stock.</p><fieldset disabled={pending} className="space-y-5"><legend className="sr-only">Product details</legend><label className="block space-y-2"><span>Product name</span><input name="name" required maxLength={150} defaultValue={product?.name} className="glass-input" /></label><label className="block space-y-2"><span>Description (optional)</span><textarea name="description" maxLength={3000} defaultValue={product?.description} rows={3} className="glass-input" /></label><label className="block space-y-2"><span>Price ({currency})</span><input name="price" type="number" min={0} step="0.01" required defaultValue={product?.price} className="glass-input" /></label><p className="text-sm break-words">Category: {category.name} {category.id && <span className="text-muted">({category.id})</span>}</p><RecordPicker url={`${base}/categories`} collection="categories" label="Choose active category" onSelect={setCategory} /><RecordPicker url={`${base}/media`} collection="media" label="Assign business image" onSelect={(item) => setMediaIds([...new Set([...mediaIds, item.id])])} /><ul className="space-y-3">{mediaIds.map((id) => <li key={id} className="flex flex-wrap items-center gap-3"><Link className="text-indigo-300 text-sm" href={`/businesses/${businessId}/media/${id}`}>View image {id.slice(-8)}</Link><button type="button" className="secondary-button" onClick={() => setMediaIds(mediaIds.filter((value) => value !== id))}>Remove image {id.slice(-8)}</button></li>)}</ul></fieldset><Link className="text-indigo-300" href={`/businesses/${businessId}/media`}>Upload images</Link><p role="alert" className="form-error">{error}</p><p role="status" className="text-emerald-200">{success}</p><button disabled={pending} className="primary-button">{pending ? "Saving…" : product ? "Save product" : "Create product"}</button></form>;
}
