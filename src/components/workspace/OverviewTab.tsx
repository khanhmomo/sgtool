"use client";

import { useState } from "react";
import {
  CalendarDays,
  MapPin,
  User,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Building2,
  BedDouble,
  Users,
  Route,
  FileText,
  AlertTriangle,
  CheckSquare,
  ClipboardList,
} from "lucide-react";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { STATUS_META } from "@/lib/design";
import { fmtDate, cn } from "@/lib/utils";
import type { TabId } from "./EventWorkspace";
import type { TabProps } from "./EventWorkspace";

export default function OverviewTab({
  event,
  patch,
  goTab,
}: TabProps & { goTab: (t: TabId) => void }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const st = STATUS_META[event.status] || STATUS_META.planning;

  // relative URL — identical on server and client (no hydration mismatch)
  const shareUrl = event.shareSlug ? `/e/${event.shareSlug}` : null;

  async function copyLink() {
    if (!shareUrl) return;
    const absolute = `${window.location.origin}${shareUrl}`;
    await navigator.clipboard.writeText(absolute).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share(action: string) {
    setSharing(true);
    try {
      const res = await fetch(`/api/events/${event.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) patch({ shareSlug: data.event.shareSlug });
    } finally {
      setSharing(false);
    }
  }

  const sections: {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    filled: boolean;
    summary: string;
  }[] = [
    {
      id: "info",
      label: "Event Information",
      icon: <Building2 size={16} />,
      filled: !!event.venue.name,
      summary: event.venue.name || "Venue & hotel",
    },
    {
      id: "team",
      label: "Team",
      icon: <Users size={16} />,
      filled: event.photographers.length > 0,
      summary: `${event.photographers.length} photographers`,
    },
    {
      id: "tactic",
      label: "Race Tactic",
      icon: <FileText size={16} />,
      filled: (event.tactic || []).length > 0,
      summary: `${(event.tactic || []).length} spots`,
    },
    {
      id: "course",
      label: "Course & Positions",
      icon: <Route size={16} />,
      filled: !!event.course || event.positions.length > 0,
      summary: `${event.positions.length} positions${event.course ? ` · ${event.course.legs.length} course legs` : " · no GPX"}`,
    },
    {
      id: "checklist",
      label: "Checklist",
      icon: <CheckSquare size={16} />,
      filled: event.checklist.length > 0,
      summary: `${event.checklist.reduce((n, g) => n + g.items.filter((i) => i.done).length, 0)}/${event.checklist.reduce((n, g) => n + g.items.length, 0)} done`,
    },
    {
      id: "tactic",
      label: "Notes",
      icon: <ClipboardList size={16} />,
      filled: !!event.notes,
      summary: event.notes ? "General notes added" : "Empty",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Event header card */}
      <Card className="overflow-hidden">
        <div className="border-b-4 border-blue-600 bg-slate-950 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge className={st.badge}>
                <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                {st.label}
              </Badge>
              <h1 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">{event.name}</h1>
              <p className="mt-0.5 text-sm text-slate-400">{event.type}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {shareUrl ? (
                <>
                  <Button size="sm" variant="outline" onClick={copyLink} className="bg-white">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy Event Link"}
                  </Button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="accent">
                      <ExternalLink size={14} /> Photographer View
                    </Button>
                  </a>
                </>
              ) : (
                <Button size="sm" variant="accent" loading={sharing} onClick={() => share("enable")}>
                  <Share2 size={14} /> Share Event
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Event date
              </p>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarDays size={13} className="text-blue-400" /> {fmtDate(event.date)}
                {event.endDate && event.endDate !== event.date ? ` – ${fmtDate(event.endDate)}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Location
              </p>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <MapPin size={13} className="text-blue-400" /> {event.location || "—"}
                {event.country ? `, ${event.country}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Team Leader
              </p>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <User size={13} className="text-blue-400" /> {event.ownerAcronym || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Organizer
              </p>
              <p className="text-sm font-semibold">{event.organizer || "—"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Sticky important info */}
      {(event.venue.meetingPoint || event.schedule.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader
            title="Key operational info"
            icon={<AlertTriangle size={15} className="text-amber-600" />}
          />
          <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
            {event.venue.meetingPoint && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Meeting point
                </p>
                <p className="text-slate-800">{event.venue.meetingPoint}</p>
              </div>
            )}
            {event.schedule[0] && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  First schedule item
                </p>
                <p className="text-slate-800">
                  {event.schedule[0].day} {event.schedule[0].time} — {event.schedule[0].title}
                </p>
              </div>
            )}
            {event.hotels.filter((h) => h.name).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  <BedDouble size={11} className="mr-1 inline" />{" "}
                  {event.hotels.filter((h) => h.name).length > 1 ? "Hotels" : "Hotel"}
                </p>
                <p className="text-slate-800">
                  {event.hotels.filter((h) => h.name).map((h) => h.name).join(", ")}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Section cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((s, i) => (
          <button key={i} onClick={() => goTab(s.id)} className="text-left">
            <Card className="h-full p-4 transition-shadow hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-slate-500">{s.icon}</span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    s.filled ? "bg-emerald-500" : "bg-slate-200"
                  )}
                />
              </div>
              <p className="text-sm font-semibold text-slate-900">{s.label}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{s.summary}</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
