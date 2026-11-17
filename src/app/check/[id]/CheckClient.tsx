"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, Search } from "lucide-react";
import { cn, fmtDate } from "@/lib/utils";

type Member = { id: string; acronym: string; name: string; role: string };
type DayChecks = Record<string, { checked: boolean; by?: string; at?: number }>;
type Checks = Record<string, DayChecks>;
type Data = { name: string; dates: string[]; team: Member[]; checks: Checks };

/** Co-leader camera-check page — per-date checkbox list, share-key access, live sync */
export default function CheckClient({ eventId, k }: { eventId: string; k: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [activeDate, setActiveDate] = useState("");
  const busy = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/events/${eventId}/camera-check?key=${encodeURIComponent(k)}`, { cache: "no-store" });
    if (!r.ok) {
      setError(r.status === 404 ? "Invalid or expired link — ask the team leader for a new one." : "Couldn't load the check list.");
      return;
    }
    const d = await r.json();
    setData({ name: d.name, dates: d.dates || [], team: d.team || [], checks: d.checks || {} });
    setActiveDate((cur) => cur || d.dates?.[0] || "undated");
  }, [eventId, k]);

  useEffect(() => {
    const t0 = setTimeout(() => void refresh(), 0);
    const t = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 2500);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [refresh]);

  const toggle = async (pid: string, cur: boolean) => {
    if (busy.current.has(pid)) return;
    busy.current.add(pid);
    setData((d) => d && {
      ...d,
      checks: { ...d.checks, [activeDate]: { ...(d.checks[activeDate] || {}), [pid]: { checked: !cur, by: "me", at: Date.now() } } },
    });
    await fetch(`/api/events/${eventId}/camera-check?key=${encodeURIComponent(k)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: activeDate, pid, checked: !cur }),
    });
    busy.current.delete(pid);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">{error}</p>
      </div>
    );
  }
  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">Loading…</div>;
  }
  const dayChecks = data.checks[activeDate] || {};
  const done = data.team.filter((m) => dayChecks[m.id]?.checked).length;
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Camera size={18} className="text-blue-600" /> Camera check
            </h1>
            <p className="text-xs text-slate-500">{data.name} — {done}/{data.team.length} verified</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
        <p className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
          Tick each member after physically checking their camera. Updates appear live for everyone viewing this page.
        </p>
        {data.dates.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {data.dates.map((d) => {
              const n = Object.values(data.checks[d] || {}).filter((c) => c.checked).length;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDate(d)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
                    d === activeDate ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-600 ring-slate-200"
                  )}
                >
                  {fmtDate(d)} <span className={cn("text-[9px]", d === activeDate ? "text-blue-100" : "text-slate-400")}>{n}/{data.team.length}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by acronym or name…"
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {data.team.filter((m) => {
            const t = q.trim().toLowerCase();
            return !t || (m.acronym || "").toLowerCase().includes(t) || (m.name || "").toLowerCase().includes(t);
          }).map((m) => {
            const c = dayChecks[m.id];
            return (
              <li key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                <button
                  type="button"
                  onClick={() => toggle(m.id, !!c?.checked)}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                    c?.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                  )}
                >
                  {c?.checked && <Check size={16} strokeWidth={3} />}
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {m.acronym || m.name}
                    {m.name && m.name !== m.acronym && <span className="ml-1.5 font-normal text-slate-500">{m.name}</span>}
                  </p>
                  {m.role && <p className="truncate text-[11px] text-slate-400">{m.role}</p>}
                </div>
                {c?.checked && (
                  <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                    {c.by ? `${c.by} · ` : ""}{c.at ? new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
