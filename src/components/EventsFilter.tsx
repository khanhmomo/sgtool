"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { Select } from "@/components/ui";
import { STATUS_META } from "@/lib/design";
import type { UserDTO } from "@/types";

export default function EventsFilter({
  q,
  status,
  sort,
  tl = "",
  tls = [],
}: {
  q: string;
  status: string;
  sort: string;
  /** Current TL filter (admin only) */
  tl?: string;
  /** Active team leaders (admin only; empty hides the select) */
  tls?: UserDTO[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearch(v: string) {
    setValue(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => go({ q: v.trim() }), 300);
  }

  function go(next: { q?: string; status?: string; sort?: string; tl?: string }) {
    const p = new URLSearchParams(params.toString());
    if (next.q !== undefined) {
      if (next.q) p.set("q", next.q);
      else p.delete("q");
    }
    if (next.status !== undefined) {
      if (next.status) p.set("status", next.status);
      else p.delete("status");
    }
    if (next.sort !== undefined) {
      if (next.sort && next.sort !== "desc") p.set("sort", next.sort);
      else p.delete("sort");
    }
    if (next.tl !== undefined) {
      if (next.tl) p.set("tl", next.tl);
      else p.delete("tl");
    }
    router.push(`/events?${p.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: value.trim() });
        }}
        className="relative"
      >
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search events…"
          className="h-9 w-56 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </form>
      <Select value={status} onChange={(e) => go({ status: e.target.value })} className="w-44">
        <option value="">All statuses</option>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
      {tls.length > 0 && (
        <Select value={tl} onChange={(e) => go({ tl: e.target.value })} className="w-44">
          <option value="">All team leaders</option>
          {tls.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.acronym})
            </option>
          ))}
        </Select>
      )}
      <Select value={sort} onChange={(e) => go({ sort: e.target.value })} className="w-40">
        <option value="desc">Newest first</option>
        <option value="asc">Oldest first</option>
      </Select>
    </div>
  );
}
