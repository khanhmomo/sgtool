"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Copy, RefreshCw, Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { cn, dateRangeYmd, fmtDate } from "@/lib/utils";
import type { TabProps } from "./EventWorkspace";

type DayChecks = Record<string, { checked: boolean; by?: string; at?: number }>;
type Checks = Record<string, DayChecks>;

/** Team camera-check list, per event date — live checkboxes shared with the co-leader page */
export default function CameraCheckTab({ event }: TabProps) {
  const dates = dateRangeYmd(event.date.slice(0, 10), (event.endDate || event.date).slice(0, 10), 31);
  const [activeDate, setActiveDate] = useState(dates[0] || "undated");
  const [checks, setChecks] = useState<Checks>(event.cameraCheck || {});
  const [shareKey, setShareKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState("");
  const busy = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/events/${event.id}/camera-check`, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setChecks(d.checks || {});
    if (d.key) setShareKey(d.key);
  }, [event.id]);

  // Live sync — SSE pushes updates instantly; slow poll as fallback
  useEffect(() => {
    const t0 = setTimeout(() => void refresh(), 0);
    const es = new EventSource(`/api/events/${event.id}/camera-check/stream`);
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data) as { checks?: Checks };
        if (d.checks) setChecks(d.checks);
      } catch { /* ignore */ }
    };
    const t = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    return () => { clearTimeout(t0); clearInterval(t); es.close(); };
  }, [refresh, tick, event.id]);

  const toggle = async (pid: string) => {
    if (busy.current.has(pid)) return;
    busy.current.add(pid);
    const next = !dayChecks[pid]?.checked;
    setChecks((c) => ({ ...c, [activeDate]: { ...(c[activeDate] || {}), [pid]: { checked: next, by: "me", at: Date.now() } } }));
    try {
      await fetch(`/api/events/${event.id}/camera-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: activeDate, pid, checked: next }),
      });
    } finally {
      busy.current.delete(pid);
    }
  };

  const dayChecks: DayChecks = checks[activeDate] || {};
  const link = shareKey ? `${typeof window !== "undefined" ? window.location.origin : ""}/check/${event.id}?key=${shareKey}` : "";
  const done = Object.values(dayChecks).filter((c) => c.checked).length;

  return (
    <Card>
      <CardHeader
        title={`Camera check — ${done}/${event.photographers.length} verified`}
        icon={<Camera size={15} className="text-blue-600" />}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              title="Refresh now"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
            >
              <RefreshCw size={14} />
            </button>
            {shareKey && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy co-leader link"}
              </button>
            )}
          </div>
        }
      />
      <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] text-slate-400">
        Tick each member after physically checking their camera. The co-leader link opens a checkbox-only page — updates sync live for everyone.
      </p>
      {dates.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
          {dates.map((d) => {
            const n = Object.values(checks[d] || {}).filter((c) => c.checked).length;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDate(d)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
                  d === activeDate ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {fmtDate(d)} <span className={cn("text-[9px]", d === activeDate ? "text-blue-100" : "text-slate-400")}>{n}/{event.photographers.length}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="relative border-b border-slate-100">
        <Search size={14} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by acronym or name…"
          className="w-full bg-transparent py-2 pl-11 pr-4 text-sm outline-none placeholder:text-slate-300"
        />
      </div>
      <ul className="divide-y divide-slate-100">
        {event.photographers.filter((p) => {
          const t = q.trim().toLowerCase();
          return !t || (p.acronym || "").toLowerCase().includes(t) || (p.name || "").toLowerCase().includes(t);
        }).map((p) => {
          const c = dayChecks[p.id];
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  c?.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-slate-400"
                )}
              >
                {c?.checked && <Check size={14} strokeWidth={3} />}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {p.acronym || p.name}
                  {p.name && p.name !== p.acronym && <span className="ml-1.5 font-normal text-slate-500">{p.name}</span>}
                </p>
                {p.role && <p className="truncate text-[11px] text-slate-400">{p.role}</p>}
              </div>
              {c?.checked && (
                <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                  {c.by ? `by ${c.by} · ` : ""}{c.at ? new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              )}
            </li>
          );
        })}
        {event.photographers.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-400">No team members yet — add them in the Team tab.</li>
        )}
      </ul>
    </Card>
  );
}
