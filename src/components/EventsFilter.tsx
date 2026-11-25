"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { Select } from "@/components/ui";
import { STATUS_META } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { EventStatus, UserDTO } from "@/types";

const STATUS_ORDER: EventStatus[] = ["planning", "ready", "live", "completed", "archived"];

export default function EventsFilter({
  q,
  status,
  sort,
  tl = "",
  tls = [],
  counts = {},
  total = 0,
}: {
  q: string;
  status: string;
  sort: string;
  /** Current TL filter (admin only) */
  tl?: string;
  /** Active team leaders (admin only; empty hides the select) */
  tls?: UserDTO[];
  /** Per-status event counts for the current ownership/search filter */
  counts?: Partial<Record<EventStatus, number>>;
  /** Total across all statuses */
  total?: number;
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

  const pill = (active: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
      active
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
    );
  const countCls = (active: boolean) =>
    cn(
      "rounded-full px-1.5 py-px text-[10px] font-bold leading-none",
      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
    );

  return (
    <div className="mb-5 space-y-3">
      {/* Toolbar: search + selects */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: value.trim() });
          }}
          className="relative min-w-0 flex-1 sm:max-w-xs"
        >
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={value}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search events…"
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </form>
        <div className="ml-auto flex items-center gap-2">
          {tls.length > 0 && (
            <Select value={tl} onChange={(e) => go({ tl: e.target.value })} className="h-9 w-44 py-0 text-xs">
              <option value="">All team leaders</option>
              {tls.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.acronym})
                </option>
              ))}
            </Select>
          )}
          <div className="relative">
            <ArrowUpDown size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Select value={sort} onChange={(e) => go({ sort: e.target.value })} className="h-9 w-36 py-0 pl-7 text-xs">
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => go({ status: "" })} className={pill(!status)}>
          All
          <span className={countCls(!status)}>{total}</span>
        </button>
        {STATUS_ORDER.map((k) => {
          const meta = STATUS_META[k];
          const n = counts[k] || 0;
          if (!n && status !== k) return null;
          return (
            <button key={k} onClick={() => go({ status: status === k ? "" : k })} className={pill(status === k)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              {meta.label}
              <span className={countCls(status === k)}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
