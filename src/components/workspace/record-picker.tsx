"use client";
import { useId, useState } from "react";
import Link from "next/link";
export type PickRecord = { id: string; name: string; price?: number; url?: string };
export function RecordPicker({ url, collection, label, onSelect }: { url: string; collection: string; label: string; onSelect: (item: PickRecord) => void }) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<PickRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  async function load(nextPage: number) {
    if (pending) return;
    setPending(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(nextPage), limit: "20", ...(collection !== "media" ? { search, status: "Active" } : {}) });
      const response = await fetch(`${url}?${query}`, { credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(response.status === 401 ? "Session expired. Log in again." : result.error?.message || "Unable to load records.");
      setRecords(result.data[collection]); setPage(nextPage); setPages(result.data.pagination.totalPages); setLoaded(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Try again."); }
    finally { setPending(false); }
  }
  return <fieldset className="space-y-3 rounded-xl border border-white/10 p-4" disabled={pending}><legend className="px-2 font-medium">{label}</legend>{collection !== "media" && <label htmlFor={id} className="block text-sm">Search by name<input id={id} value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} className="glass-input mt-2" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void load(1); } }} /></label>}<button type="button" className="secondary-button" onClick={() => void load(1)}>{pending ? "Loading…" : collection === "media" ? "Browse images" : "Find records"}</button><p role="alert" className="form-error">{error}</p>{error.includes("Session expired") && <Link className="secondary-button" href="/login?reason=session">Log in</Link>}{loaded && !records.length && <p role="status" className="text-muted">No active records found.</p>}{pending && <div role="status" aria-label="Loading records" className="space-y-2">{[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-white/10" />)}</div>}<ul className="grid gap-2">{records.map((item) => <li key={item.id}><button type="button" className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 p-3 text-left" onClick={() => onSelect(item)}>{item.url ? <><span className="h-20 w-20 shrink-0 rounded-lg bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(item.url)})` }} role="img" aria-label={`Image ${item.id.slice(-8)}`} /><span className="text-indigo-300">Select image {item.id.slice(-8)}</span></> : <><span className="min-w-0 break-words">{item.name}</span><span className="text-indigo-300">Select</span></>}</button></li>)}</ul>{loaded && <div className="flex flex-wrap items-center gap-3 text-sm"><span>Page {page} of {Math.max(1, pages)}</span>{page > 1 && <button type="button" className="secondary-button" onClick={() => void load(page - 1)}>Previous</button>}{page < pages && <button type="button" className="secondary-button" onClick={() => void load(page + 1)}>Next</button>}</div>}</fieldset>;
}
