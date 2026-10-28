"use client";

import { useEffect, useState } from "react";
import { Inbox, Check, Ban, ChevronDown, Trash2 } from "lucide-react";
import { Card, CardHeader, Empty, Textarea } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";
import type { EventRequest } from "@/types";
import type { TabProps } from "./EventWorkspace";
import { useAutosave } from "./autosave";

const STATUS_META: Record<EventRequest["status"], { label: string; cls: string }> = {
  new: { label: "Need review", cls: "bg-amber-100 text-amber-800" },
  read: { label: "Read", cls: "bg-slate-100 text-slate-600" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
};

export default function RequestsTab({ event, patch }: TabProps) {
  const [requests, setRequests] = useState<EventRequest[]>(event.requests || []);
  const [open, setOpen] = useState<string | null>(null);
  useAutosave(requests, patch, (v) => ({ requests: v }));

  // Near-realtime: SSE stream pushes the requests array whenever it changes
  // (~2s). Merge only NEW ids so local edits (status/TL note) aren't clobbered.
  // A slow poll remains as fallback if the stream can't connect.
  useEffect(() => {
    let cancelled = false;
    const merge = (server: EventRequest[]) => {
      if (cancelled) return;
      setRequests((local) => {
        const localIds = new Set(local.map((x) => x.id));
        const fresh = server.filter((x) => !localIds.has(x.id));
        return fresh.length ? [...local, ...fresh] : local;
      });
    };

    const es = new EventSource(`/api/requests/stream?event=${event.id}`);
    es.onmessage = (e) => {
      try {
        merge(JSON.parse(e.data));
      } catch {}
    };

    let poll: ReturnType<typeof setInterval> | null = null;
    const startPoll = () => {
      if (poll) return;
      poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/events/${event.id}`);
          if (r.ok) merge((await r.json())?.event?.requests || []);
        } catch {}
      }, 15_000);
    };
    es.onerror = () => startPoll(); // keep updating even if SSE is unavailable

    return () => {
      cancelled = true;
      es.close();
      if (poll) clearInterval(poll);
    };
  }, [event.id]);

  function set(id: string, p: Partial<EventRequest>) {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function toggle(id: string, status: EventRequest["status"]) {
    setRequests((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: r.status === "new" ? "read" : r.status } : r))
    );
    setOpen((o) => (o === id ? null : id));
    void status;
  }

  const pending = requests.filter((r) => r.status === "new" || r.status === "read").length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader
          title={requests.length ? `Photographer requests (${pending} open)` : "Photographer requests"}
          icon={<Inbox size={15} className="text-blue-600" />}
        />
        <div className="p-4">
          {requests.length === 0 ? (
            <Empty
              icon={<Inbox size={26} />}
              title="No requests yet"
              hint="Photographers can send requests from the shared event page — they'll show up here."
            />
          ) : (
            <div className="space-y-2">
              {[...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => (
                <div key={r.id} className="rounded-md border border-slate-200">
                  {/* Header row — clicking opens & marks "read" */}
                  <button
                    onClick={() => toggle(r.id, r.status)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", STATUS_META[r.status].cls)}>
                      {STATUS_META[r.status].label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                      {r.name}
                      {r.acronym && <span className="ml-1.5 text-xs font-bold text-slate-400">{r.acronym}</span>}
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{fmtDate(r.createdAt)}</span>
                    <ChevronDown size={14} className={cn("shrink-0 text-slate-400 transition-transform", open === r.id && "rotate-180")} />
                  </button>
                  {/* Expanded body */}
                  {open === r.id && (
                    <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{r.body}</p>
                      <div className="flex flex-wrap gap-2">
                        {r.status !== "accepted" && (
                          <button
                            onClick={() => set(r.id, { status: "accepted" })}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            <Check size={13} /> Accept
                          </button>
                        )}
                        {r.status !== "declined" && (
                          <button
                            onClick={() => set(r.id, { status: "declined" })}
                            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                          >
                            <Ban size={13} /> Decline
                          </button>
                        )}
                        <button
                          onClick={() => setRequests((rs) => rs.filter((x) => x.id !== r.id))}
                          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          TL note <span className="font-normal normal-case text-slate-400">(private)</span>
                        </p>
                        <Textarea
                          rows={2}
                          value={r.tlNote}
                          onChange={(e) => set(r.id, { tlNote: e.target.value })}
                          placeholder="Internal note — not visible to photographers"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
