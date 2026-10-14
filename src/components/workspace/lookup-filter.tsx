"use client";
import { useRouter } from "next/navigation";
import { RecordPicker } from "@/components/workspace/record-picker";

export function LookupFilter({ businessId, collection, field, label, query }: {
  businessId: string;
  collection: "categories" | "customers";
  field: string;
  label: string;
  query: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <details className="rounded-xl border border-white/10 p-4">
      <summary className="cursor-pointer text-sm font-medium text-indigo-300">{label}</summary>
      <div className="mt-4">
        <RecordPicker url={`/api/businesses/${businessId}/${collection}`} collection={collection}
          label={label} onSelect={(item) => {
            const filters = new URLSearchParams({ ...query, [field]: item.id });
            filters.delete("page");
            router.push(`?${filters}`);
          }} />
      </div>
    </details>
  );
}
