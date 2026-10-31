"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  MapPin,
  BedDouble,
  AlarmClock,
  CalendarClock,
  Camera,
  Target,
  Route as RouteIcon,
  FolderOpen,
  AlertTriangle,
  ExternalLink,
  FileText,
  ChevronDown,
  ImageIcon,
  Eye,
  Navigation,
  Images,
  Megaphone,
  MessageSquarePlus,
  Timer,
  CloudSun,
} from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { STATUS_META, SPORT_META } from "@/lib/design";
import { fmtDate, isImageMime, isPdfMime, cn, spotMapUrl, dateRangeYmd } from "@/lib/utils";
import { extractCoords, isShortMapLink } from "@/lib/coords";
import type { ParsedCoords } from "@/lib/coords";
import tzLookup from "tz-lookup";
import Markdown from "@/components/Markdown";
import { FileTypeBadge, Lightbox, PdfViewer } from "@/components/FileViewers";
import type { EventDTO, FileDTO } from "@/types";
import { HyroxPublicView } from "@/components/workspace/HyroxTactic";

const CourseMap = dynamic(() => import("@/components/CourseMap"), { ssr: false });
const WeatherForecast = dynamic(() => import("@/components/WeatherForecast"), { ssr: false });

/** Thumbnails shown before "+N more" opens the lightbox */
const PREVIEW_COUNT = 12;

/** Dark row backgrounds need white text; light/default rows keep slate-900. */
function contrastFg(bg: string): string | undefined {
  const m = bg.match(/#([0-9a-f]{6})/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? undefined : "#ffffff";
}

function Section({
  id,
  icon,
  title,
  children,
  defaultOpen = true,
  className,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <Card className="overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          <span className="text-blue-600">{icon}</span>
          <h2 className="flex-1 text-sm font-bold uppercase tracking-wide text-slate-900">
            {title}
          </h2>
          <ChevronDown
            size={16}
            className={cn("text-slate-400 transition-transform", !open && "-rotate-90")}
          />
        </button>
        {open && <div className="border-t border-slate-100 px-4 py-3">{children}</div>}
      </Card>
    </section>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children || (typeof children === "string" && !children.trim())) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

function MapLink({ url, label = "Open in Google Maps" }: { url?: string; label?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
    >
      <Navigation size={11} /> {label}
    </a>
  );
}

export default function PublicEvent({ event, files }: { event: EventDTO; files: FileDTO[] }) {
  const [pdf, setPdf] = useState<FileDTO | null>(null);
  const [imgIndex, setImgIndex] = useState<number | null>(null);
  const [tacticSort, setTacticSort] = useState<"order" | "spot" | "photographer" | "arrival">("order");
  const [tacticFilter, setTacticFilter] = useState("");
  const [hyroxDay, setHyroxDay] = useState(0);
  // Show only PUBLISHED days inside the event date range — stale saved days
  // outside the range are visible in the editor for recovery but hidden here.
  const hyroxDays = (event.hyrox || []).filter((d) => {
    if (!d.published) return false;
    const start = event.date.slice(0, 10);
    const end = (event.endDate || "").slice(0, 10);
    return !start || (d.date >= start && (!end || d.date <= end));
  });
  const [tacticDay, setTacticDay] = useState(0);
  const images = files.filter((f) => isImageMime(f.mime));
  const st = STATUS_META[event.status] || STATUS_META.planning;
  const legs = event.course?.legs || [];
  const isFitnessIndoor = /fitness\s*indoor/i.test(event.type);

  /** "7:30 AM" → minutes since midnight for sorting; unparseable → +∞ */
  const timeToMin = (t: string) => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return 24 * 60;
    let h = +m[1];
    if (/pm/i.test(m[3]) && h < 12) h += 12;
    if (/am/i.test(m[3]) && h === 12) h = 0;
    return h * 60 + +m[2];
  };

  // Multi-day events keep one tactic table per day (tacticDays); legacy
  // single-day uses tactic. Photographers only see published days — the
  // TL sends the link before the tactic is finished.
  const pubTacticDays = (event.tacticDays || []).filter((d) => d.published);
  const tacticRows =
    pubTacticDays.length > 0
      ? (pubTacticDays[tacticDay] || pubTacticDays[0]).rows
      : (event.tacticDays || []).length === 0 && event.tacticPublished
        ? event.tactic || []
        : [];

  const sortedTactic = [...tacticRows]
    .filter(
      (r) =>
        !tacticFilter ||
        r.photographer
          .split(",")
          .map((s) => s.trim())
          .includes(tacticFilter)
    )
    .sort((a, b) => {
      if (tacticSort === "spot") return (a.spot || "").localeCompare(b.spot || "");
      if (tacticSort === "photographer") {
        const an = event.photographers.find((p) => p.acronym === a.photographer)?.name || a.photographer || "zzz";
        const bn = event.photographers.find((p) => p.acronym === b.photographer)?.name || b.photographer || "zzz";
        return an.localeCompare(bn);
      }
      if (tacticSort === "arrival") return timeToMin(a.arrival || "") - timeToMin(b.arrival || "");
      return 0;
    });

  // Best-of lightbox state + FileDTO-shaped wrappers for the shared Lightbox
  const [boIndex, setBoIndex] = useState<number | null>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ name: "", acronym: "", body: "" });
  const [reqState, setReqState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [clockOpen, setClockOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Event-local timezone: venue map-link coords → first spot coords.
  // Short links (maps.app.goo.gl) hide coords client-side — resolve via API.
  const [venueCoords, setVenueCoords] = useState<ParsedCoords | null>(null);
  useEffect(() => {
    const link = event.venue?.mapLink || "";
    if (extractCoords(link) || !isShortMapLink(link)) return;
    const venueName = (event.venue?.name || "").replace(/\s*\(.*?\)\s*/g, "").trim();
    const q = [venueName, event.location, event.country].filter(Boolean).join(", ");
    let live = true;
    fetch(`/api/resolve-map?url=${encodeURIComponent(link)}&q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d?.lat != null && d?.lng != null) setVenueCoords({ lat: d.lat, lng: d.lng });
      })
      .catch(() => {});
    return () => { live = false; };
  }, [event.venue?.mapLink, event.venue?.name, event.location, event.country]);

  // Venue coords: map-link → resolved short link → first position marker →
  // first course track point (weather still works when venue info is missing)
  const spotCoords = (() => {
    const c =
      extractCoords(event.venue?.mapLink || "") ||
      venueCoords ||
      (event.positions || []).find((p) => p.lat != null && p.lng != null) ||
      event.course?.legs?.[0]?.points?.[0];
    const lat = c && "lat" in c ? c.lat : undefined;
    const lng = c && "lng" in c ? c.lng : undefined;
    return lat != null && lng != null ? { lat, lng } : null;
  })();

  const eventTz = (() => {
    if (!spotCoords) return undefined;
    try {
      return tzLookup(spotCoords.lat, spotCoords.lng);
    } catch {
      return undefined;
    }
  })();

  // Tick the camera-check clock at 250ms so seconds flip promptly
  useEffect(() => {
    if (!clockOpen) return;
    const t = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(t);
  }, [clockOpen]);

  async function sendRequest() {
    setReqState("sending");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: event.shareSlug, ...reqForm }),
      });
      setReqState(res.ok ? "sent" : "error");
    } catch {
      setReqState("error");
    }
  }
  const boFiles: FileDTO[] = (event.bestof?.images || []).map((src, i) => ({
    id: `bo-${i}`,
    url: src,
    filename: `Best-of ${i + 1}`,
    mime: "image/jpeg",
    size: 0,
    category: "other",
    description: "",
    hidden: false,
    uploadedBy: "",
    createdAt: "",
  }));

  const nav = [
    { id: "briefing", label: "Briefing", icon: Megaphone, show: !!event.briefing?.trim() },
    { id: "venue", label: "Venue", icon: MapPin, show: !!event.venue.name },
    { id: "tactic", label: "Tactic", icon: Target, show: pubTacticDays.length > 0 || ((event.tacticDays || []).length === 0 && event.tacticPublished && (event.tactic || []).length > 0) || hyroxDays.length > 0 },
    { id: "course", label: "Course", icon: RouteIcon, show: legs.length > 0 },
    { id: "files", label: "Files", icon: FolderOpen, show: files.length > 0 },
    { id: "hotel", label: "Hotel", icon: BedDouble, show: event.hotels.some((h) => h.name) },
    { id: "team", label: "Team", icon: Camera, show: event.photographers.length > 0 },
    { id: "bestof", label: "Best-of", icon: Images, show: (event.bestof?.images.length ?? 0) > 0 },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="border-b-4 border-blue-600 bg-slate-950 px-4 py-5 text-white">
        <div className="mx-auto max-w-2xl lg:max-w-5xl">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Sportograf" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Sportograf · Event briefing
            </p>
            <Badge className={cn(st.badge, "ml-auto")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
              {st.label}
            </Badge>
          </div>
          <h1 className="mt-3 text-xl font-bold leading-tight md:text-2xl">{event.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
            <span className="flex items-center gap-1.5">
              <CalendarClock size={13} className="text-blue-400" />
              {fmtDate(event.date)}
              {event.endDate && event.endDate !== event.date ? ` – ${fmtDate(event.endDate)}` : ""}
            </span>
            {(event.location || event.country) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-blue-400" />
                {[event.location, event.country].filter(Boolean).join(", ")}
              </span>
            )}
            <span className="text-slate-400">TL: {[event.ownerAcronym, ...(event.teamLeaderInfos || []).map((t) => t.acronym)].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setReqOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              <MessageSquarePlus size={14} /> Make request
            </button>
            <button
              onClick={() => { setNow(new Date()); setClockOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <Timer size={14} /> Camera check
            </button>
          </div>
        </div>
      </header>

      {/* Sticky quick nav */}
      {nav.length > 0 && (
        <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-3 py-2 lg:max-w-5xl">
            {nav.map((n) => {
              const Icon = n.icon;
              return (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
                >
                  <Icon size={13} />
                  {n.label}
                </a>
              );
            })}
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-2xl space-y-3 px-3 pt-4 lg:max-w-5xl lg:space-y-4 lg:px-6 lg:pt-6">
        {/* Critical notes banner */}
        {event.notes && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
              <AlertTriangle size={13} /> Important notes
            </p>
            <Markdown text={event.notes} />
          </div>
        )}

        {/* Venue — full width on desktop */}
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Venue */}
        {(event.venue.name || event.venue.meetingPoint) && (
          <Section id="venue" icon={<MapPin size={16} />} title="Venue" className="lg:col-span-2">
            <div className="space-y-2.5">
              {event.venue.name && <p className="text-base font-bold text-slate-900">{event.venue.name}</p>}
              <KV label="Address">{event.venue.address}</KV>
              <MapLink url={event.venue.mapLink} label="Open venue in Maps" />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <KV label="Meeting point">{event.venue.meetingPoint}</KV>
                <KV label="Entrance">{event.venue.entrance}</KV>
                <KV label="Parking">{event.venue.parking}</KV>
                <KV label="Access">{event.venue.access}</KV>
                <KV label="Accreditation">{event.venue.accreditation}</KV>
              </div>
              {event.venue.notes && <Markdown text={event.venue.notes} className="pt-1" />}
            </div>
          </Section>
        )}

        </div>

        {/* Briefing */}
        {event.briefing?.trim() && (
          <Section id="briefing" icon={<Megaphone size={16} />} title="Briefing" className="lg:col-span-2">
            <Markdown text={event.briefing} />
          </Section>
        )}

        {/* Tactic — HYROX station plan or spot assignment table */}
        {hyroxDays.length > 0 ? (
          <Section id="tactic" icon={<Target size={16} />} title="Tactic">
            {hyroxDays.length > 1 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {hyroxDays.map((d, i) => (
                  <button
                    key={d.date}
                    onClick={() => setHyroxDay(i)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-bold",
                      i === hyroxDay
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {fmtDate(d.date)}
                  </button>
                ))}
              </div>
            )}
            <HyroxPublicView
              hyrox={(hyroxDays[hyroxDay] || hyroxDays[0]).tactic}
              team={event.photographers.map((p) => p.acronym || p.name)}
              callTime={(hyroxDays[hyroxDay] || hyroxDays[0]).callTime}
              dayNote={(hyroxDays[hyroxDay] || hyroxDays[0]).note}
            />
          </Section>
        ) : (pubTacticDays.length > 0 || ((event.tacticDays || []).length === 0 && event.tacticPublished && (event.tactic || []).length > 0)) && (
          <Section id="tactic" icon={<Target size={16} />} title="Tactic">
            {pubTacticDays.length > 1 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {pubTacticDays.map((d, i) => (
                  <button
                    key={d.date || i}
                    onClick={() => setTacticDay(i)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                      i === tacticDay
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {d.date ? fmtDate(d.date) : `Day ${i + 1}`}
                    {d.callTime && (
                      <span
                        className={cn(
                          "ml-1.5 inline-flex items-center gap-1 font-bold",
                          i === tacticDay ? "text-blue-300" : "text-blue-600"
                        )}
                      >
                        <AlarmClock size={11} /> {d.callTime}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="mb-2 flex items-center justify-end gap-3">
              <select
                value={tacticFilter}
                onChange={(e) => setTacticFilter(e.target.value)}
                className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All photographers</option>
                {event.photographers.map((p) => (
                  <option key={p.id} value={p.acronym}>
                    {p.name || p.acronym}
                  </option>
                ))}
              </select>
              <span className="text-[11px] font-medium text-slate-500">Sort by</span>
              <select
                value={tacticSort}
                onChange={(e) => setTacticSort(e.target.value as typeof tacticSort)}
                className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="order">Race order</option>
                <option value="spot">Spot name</option>
                <option value="photographer">Photographer</option>
                {!isFitnessIndoor && <option value="arrival">Arrival time</option>}
              </select>
            </div>
            {(event.tacticDays || []).length <= 1 &&
              (pubTacticDays[0]?.callTime) && (
                <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                  <AlarmClock size={12} /> Call {pubTacticDays[0].callTime}
                </p>
              )}
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Spot</th>
                    <th className="px-3 py-2">Photographer</th>
                    {isFitnessIndoor && <th className="px-3 py-2">LS</th>}
                    <th className="px-3 py-2">Lens</th>
                    {!isFitnessIndoor && <th className="px-3 py-2">Arrival</th>}
                    {!isFitnessIndoor && <th className="px-3 py-2">Location</th>}
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTactic.map((r) => {
                    const acrs = r.photographer.split(",").map((s) => s.trim()).filter(Boolean);
                    const mates = acrs
                      .map((a) => ({ a, p: event.photographers.find((x) => x.acronym === a) }))
                      .filter((m) => m.a);
                    // Fall back to the matching course spot when the row has no stored link
                    const pos = (event.positions || []).find(
                      (p) => p.lat !== null && p.lng !== null && (p.photographer || p.id) === r.spot
                    );
                    // Prefer live position coords — stored mapLinks from before
                    // the loc: fix still snap to the nearest named place.
                    const link = pos ? spotMapUrl(pos.lat!, pos.lng!) : r.mapLink;
                    // White text on dark row colors (red/blue/violet), else default
                    const fg = r.color ? contrastFg(r.color) : undefined;
                    const fgStyle = fg ? { color: fg } : undefined;
                    return (
                      <tr
                        key={r.id}
                        style={r.color ? { background: r.color } : undefined}
                        className="border-b border-slate-100 last:border-0 align-top"
                      >
                        <td className="min-w-28 max-w-44 px-3 py-2 font-bold text-slate-900" style={fgStyle}>
                          <span className="break-words">{r.spot}</span>
                        </td>
                        <td className="px-3 py-2">
                          {mates.length ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {mates.map(({ a, p }) => (
                                <span key={a} className="inline-flex items-center">
                                  <span className="inline-flex h-5 min-w-10 items-center justify-center rounded bg-slate-900 px-1.5 text-[11px] font-bold text-white">
                                    {a}
                                  </span>
                                  {p?.name && (
                                    <span className="ml-1 font-bold text-slate-900" style={fgStyle}>{p.name}</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {isFitnessIndoor && (
                          <td className="px-3 py-2">
                            {(r.ls || "").split(",").map((s) => s.trim()).filter(Boolean).length ? (
                              <div className="flex flex-wrap items-center gap-1">
                                {(r.ls || "").split(",").map((s) => s.trim()).filter(Boolean).map((a) => (
                                  <span
                                    key={a}
                                    className="inline-flex h-5 min-w-8 items-center justify-center rounded bg-amber-400 px-1.5 text-[11px] font-bold text-amber-950"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 whitespace-nowrap font-bold text-slate-900" style={fgStyle}>{r.lens || "—"}</td>
                        {!isFitnessIndoor && (
                          <td className="px-3 py-2 whitespace-nowrap font-bold text-slate-900" style={fgStyle}>
                            {r.arrival || "—"}
                          </td>
                        )}
                        {!isFitnessIndoor && (
                          <td className="px-3 py-2">
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-700"
                              >
                                <Navigation size={11} /> Maps
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 text-slate-900" style={fgStyle}>
                          <span className="break-words">{r.note || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(() => {
              const day = pubTacticDays[tacticDay] || pubTacticDays[0];
              const withCall = pubTacticDays.filter((d) => d.callTime);
              return (
                <>
                  {withCall.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                      {withCall.map((d) => (
                        <p key={d.date} className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                          <AlarmClock size={13} /> {d.date ? fmtDate(d.date) : "Day"} — Call time {d.callTime}
                        </p>
                      ))}
                    </div>
                  )}
                  {day?.note && (
                    <Markdown text={day.note} className="mt-3 border-t border-slate-100 pt-3 text-xs" />
                  )}
                </>
              );
            })()}
          </Section>
        )}

        {/* Course map */}
        {legs.length > 0 && (
          <Section id="course" icon={<RouteIcon size={16} />} title="Course map">
            <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-500">
              {legs.map((l, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SPORT_META[l.sport].line }} />
                  {l.name} — {l.distanceKm.toFixed(1)} km
                </span>
              ))}
            </div>
            {(() => {
              // Only show spots that appear on a PUBLISHED tactic, in row
              // colors. A spot's key matches a position via photographer or id.
              // Hidden tactic → no spots on the map either.
              const hasTacticData =
                (event.tacticDays || []).length > 0 || (event.tactic || []).length > 0;
              const pubRows = pubTacticDays.length
                ? pubTacticDays.flatMap((d) => d.rows)
                : event.tacticPublished
                  ? event.tactic || []
                  : [];
              const spotColor = new Map<string, string>();
              for (const r of pubRows) {
                if (r.spot && !spotColor.has(r.spot)) spotColor.set(r.spot, r.color || "");
              }
              const mapPositions = !hasTacticData
                ? event.positions // no tactic exists yet — show all like before
                : (event.positions || []).filter((p) =>
                    spotColor.has(p.photographer || p.id)
                  );
              const positionColors = Object.fromEntries(
                mapPositions
                  .map((p) => {
                    const c = spotColor.get(p.photographer || p.id);
                    return c ? [p.id, c] : null;
                  })
                  .filter((e): e is [string, string] => !!e)
              );
              return (
                <CourseMap
                  legs={legs}
                  positions={mapPositions}
                  positionColors={positionColors}
                  height={320}
                />
              );
            })()}
          </Section>
        )}

        {/* Weather — outdoor event types only */}
        {(() => {
          // indoor formats (HYROX / Fitness Indoor) don't need a forecast
          const outdoor = !/hyrox|indoor/i.test(event.type);
          if (!outdoor) return null;
          // Every day of the event gets its own 24h card — fixed event dates,
          // never shifted by the viewer's timezone (see dateRangeYmd)
          const dates = dateRangeYmd(event.date, event.endDate, 7);
          if (!dates.length) return null;
          return (
            <Section id="weather" icon={<CloudSun size={16} />} title="Weather forecast">
              <WeatherForecast
                dates={dates}
                lat={spotCoords?.lat}
                lng={spotCoords?.lng}
                q={[event.venue?.name, event.location, event.country].filter(Boolean).join(", ")}
              />
            </Section>
          );
        })()}

        {/* Files */}
        {files.length > 0 && (
          <Section id="files" icon={<FolderOpen size={16} />} title="Files">
            <div className="space-y-2">
              {files.map((f) => {
                const isImg = isImageMime(f.mime);
                const isPdf = isPdfMime(f.mime);
                return (
                  <div key={f.id} className="flex items-center gap-3 rounded-md border border-slate-200 p-2.5">
                    {isImg ? (
                      <button
                        onClick={() => setImgIndex(images.findIndex((x) => x.id === f.id))}
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-md"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt={f.filename} className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                        {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{f.filename}</p>
                      <div className="flex items-center gap-1.5">
                        <FileTypeBadge mime={f.mime} />
                        {f.description && (
                          <p className="truncate text-[11px] text-slate-400">{f.description}</p>
                        )}
                      </div>
                    </div>
                    {(isPdf || isImg) ? (
                      <button
                        onClick={() =>
                          isPdf ? setPdf(f) : setImgIndex(images.findIndex((x) => x.id === f.id))
                        }
                        className="flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white"
                      >
                        <Eye size={12} /> View
                      </button>
                    ) : (
                      <a
                        href={f.url}
                        download={f.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white"
                      >
                        <ExternalLink size={12} /> Open
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Hotel + Team — full width, stacked */}
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Hotels */}
        {event.hotels.some((ht) => ht.name) && (
          <Section id="hotel" icon={<BedDouble size={16} />} title={event.hotels.length > 1 ? "Hotels" : "Hotel"} className="lg:col-span-2">
            <div className="space-y-5">
              {event.hotels.filter((ht) => ht.name).map((hotel, i) => (
                <div key={i} className="space-y-2.5">
                  {event.hotels.length > 1 && i > 0 && <hr className="border-slate-200" />}
                  <p className="text-base font-bold text-slate-900">{hotel.name}</p>
                  <KV label="Address">{hotel.address}</KV>
                  <MapLink url={hotel.mapLink} label="Open hotel in Maps" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <KV label="Check-in">{hotel.checkIn}</KV>
                    <KV label="Check-out">{hotel.checkOut}</KV>
                    <KV label="Booking ref">{hotel.bookingRef}</KV>
                    <KV label="Breakfast">{hotel.breakfast}</KV>
                    <KV label="Parking">{hotel.parking}</KV>
                  </div>
                  {(hotel.roomAssign || []).length > 0 ? (
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                            <th className="px-3 py-1.5 w-24">Room</th>
                            <th className="px-3 py-1.5">Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hotel.roomAssign.map((r) => (
                            <tr key={r.id} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-1.5 font-bold text-slate-900">{r.room}</td>
                              <td className="px-3 py-1.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  {r.members.map((m) => {
                                    const p = event.photographers.find((x) => x.acronym === m);
                                    return (
                                      <span key={m} className="text-slate-700">
                                        <span className="inline-flex h-[18px] min-w-8 items-center justify-center rounded bg-slate-900 px-1 text-[10px] font-bold text-white">
                                          {m}
                                        </span>
                                        {p?.name ? ` ${p.name}` : ""}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <KV label="Rooms">{hotel.rooms}</KV>
                  )}
                  {hotel.notes && <Markdown text={hotel.notes} className="pt-1" />}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Team */}
        {event.photographers.length > 0 && (
          <Section id="team" icon={<Camera size={16} />} title="Team" defaultOpen={false} className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {event.photographers.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    {p.acronym}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{p.name || p.acronym}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.role}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
        </div>

        {/* Best-of reference gallery (previous year) */}
        {event.bestof && event.bestof.images.length > 0 && (
          <Section id="bestof" icon={<Images size={16} />} title={`Best-of reference · ${event.bestof.images.length} photos`} defaultOpen={false}>
            <p className="mb-3 text-xs text-slate-500">
              Reference gallery from a previous edition ·{" "}
              <a href={event.bestof.link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                View on sportograf.com
              </a>
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {event.bestof.images.slice(0, PREVIEW_COUNT).map((src, i) => (
                <button
                  key={i}
                  onClick={() => setBoIndex(i)}
                  className="group block overflow-hidden rounded-md bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external CDN images */}
                  <img
                    src={src}
                    alt={`Best-of ${i + 1}`}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                </button>
              ))}
              {event.bestof.images.length > PREVIEW_COUNT && (
                <button
                  onClick={() => setBoIndex(PREVIEW_COUNT)}
                  className="flex aspect-square items-center justify-center rounded-md bg-slate-900 text-sm font-bold text-white transition-colors hover:bg-slate-700"
                >
                  +{event.bestof.images.length - PREVIEW_COUNT} more
                </button>
              )}
            </div>
          </Section>
        )}

        <footer className="pt-6 text-center text-[10px] uppercase tracking-widest text-slate-400">
          Sportograf TL Tool · Powered by KTPROD Technology
        </footer>
      </main>

      {pdf && <PdfViewer file={pdf} onClose={() => setPdf(null)} />}
      {boIndex !== null && event.bestof && (
        <Lightbox
          files={boFiles}
          index={boIndex}
          onClose={() => setBoIndex(null)}
          onNavigate={setBoIndex}
        />
      )}
      {/* Photographer request modal */}
      {reqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReqOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-bold text-slate-800">Make a request</p>
              <p className="text-xs text-slate-400">Sent to the team leader — they&apos;ll review it in their workspace.</p>
            </div>
            {reqState === "sent" ? (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-emerald-600">Request sent — thank you!</p>
                <button onClick={() => { setReqOpen(false); setReqState("idle"); setReqForm({ name: "", acronym: "", body: "" }); }} className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Close</button>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
                    <input
                      value={reqForm.name}
                      onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Acronym</p>
                    <input
                      value={reqForm.acronym}
                      onChange={(e) => setReqForm({ ...reqForm, acronym: e.target.value.toUpperCase() })}
                      placeholder="JD"
                      maxLength={6}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Request</p>
                  <textarea
                    value={reqForm.body}
                    onChange={(e) => setReqForm({ ...reqForm, body: e.target.value })}
                    rows={4}
                    placeholder="e.g. Could I swap Bike 1 with another photographer?"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                {reqState === "error" && <p className="text-xs font-medium text-red-600">Failed to send — please try again.</p>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setReqOpen(false)} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">
                    Cancel
                  </button>
                  <button
                    onClick={sendRequest}
                    disabled={!reqForm.name.trim() || !reqForm.body.trim() || reqState === "sending"}
                    className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {reqState === "sending" ? "Sending…" : "Send request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera check — atomic-clock modal for syncing camera time */}
      {clockOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4"
          onClick={() => setClockOpen(false)}
        >
          <div className="w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Camera check</p>
            {eventTz ? (
              <>
                <p className="mt-6 whitespace-nowrap font-mono text-5xl font-bold tabular-nums text-white md:text-6xl">
                  {now
                    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: eventTz })
                    .replace(/ ?([AP]M)$/i, "")}
                  <span className="ml-2 text-3xl font-semibold text-blue-400 md:text-4xl">
                    {now.toLocaleTimeString("en-US", { hour: "numeric", hour12: true, timeZone: eventTz }).replace(/^\d+ ?/i, "")}
                  </span>
                </p>
                <p className="mt-4 font-mono text-lg text-slate-300">
                  {now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: eventTz })}
                </p>
              </>
            ) : (
              <p className="mt-8 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300">
                Event location unavailable — ask your team leader to set the venue map link so this clock shows local event time.
              </p>
            )}
            <p className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-400">
              <MapPin size={14} className="text-blue-400" />
              {[event.location, event.country].filter(Boolean).join(", ") || event.name}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {eventTz && `Event local time · ${eventTz.replace(/_/g, " ")}`}
            </p>
            <button
              onClick={() => setClockOpen(false)}
              className="mt-8 rounded-md bg-slate-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {imgIndex !== null && images[imgIndex] && (
        <Lightbox files={images} index={imgIndex} onClose={() => setImgIndex(null)} onNavigate={setImgIndex} />
      )}
    </div>
  );
}
