"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { STATUS_META, SPORT_META } from "@/lib/design";
import { fmtDate, isImageMime, isPdfMime, cn, googleMapsUrl } from "@/lib/utils";
import Markdown from "@/components/Markdown";
import { FileTypeBadge, Lightbox, PdfViewer } from "@/components/FileViewers";
import type { EventDTO, FileDTO } from "@/types";
import { HyroxPublicView } from "@/components/workspace/HyroxTactic";

const CourseMap = dynamic(() => import("@/components/CourseMap"), { ssr: false });

/** Thumbnails shown before "+N more" opens the lightbox */
const PREVIEW_COUNT = 12;

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
  const [tacticDay, setTacticDay] = useState(0);
  const images = files.filter((f) => isImageMime(f.mime));
  const st = STATUS_META[event.status] || STATUS_META.planning;
  const legs = event.course?.legs || [];
  const isFitnessIndoor = /fitness\s*indoor/i.test(event.type);

  // morning call-time entries: schedule items titled e.g. "Call time", "Meet at…"
  const callTimes = event.schedule.filter((s) => /call|meet|brief/i.test(s.title));

  /** "7:30 AM" → minutes since midnight for sorting; unparseable → +∞ */
  const timeToMin = (t: string) => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return 24 * 60;
    let h = +m[1];
    if (/pm/i.test(m[3]) && h < 12) h += 12;
    if (/am/i.test(m[3]) && h === 12) h = 0;
    return h * 60 + +m[2];
  };

  // Multi-day events keep one tactic table per day (tacticDays); legacy single-day uses tactic
  const tacticRows =
    (event.tacticDays || []).length > 0
      ? (event.tacticDays[tacticDay] || event.tacticDays[0]).rows
      : event.tactic || [];

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
    { id: "calltime", label: "Call time", icon: AlarmClock, show: callTimes.length > 0 },
    { id: "tactic", label: "Tactic", icon: Target, show: (event.tactic || []).length > 0 || (event.hyrox || []).length > 0 },
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
            <span className="text-slate-400">TL: {event.ownerAcronym}</span>
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

        {/* Call time — fixed banner card */}
        {callTimes.length > 0 && (
          <section id="calltime" className="scroll-mt-20 lg:col-span-2">
            <Card className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <AlarmClock size={16} />
              </span>
              <p className="text-sm text-slate-700">
                <span className="font-bold text-slate-900">Call time:</span>{" "}
                <span className="font-bold text-blue-700">{callTimes[0].time}</span>
                {callTimes[0].detail && (
                  <span className="ml-2 text-xs text-slate-500">{callTimes[0].detail}</span>
                )}
              </p>
            </Card>
          </section>
        )}
        </div>

        {/* Briefing */}
        {event.briefing?.trim() && (
          <Section id="briefing" icon={<Megaphone size={16} />} title="Briefing" className="lg:col-span-2">
            <Markdown text={event.briefing} />
          </Section>
        )}

        {/* Tactic — HYROX station plan or spot assignment table */}
        {(event.hyrox || []).length > 0 ? (
          <Section id="tactic" icon={<Target size={16} />} title="Tactic">
            {event.hyrox.length > 1 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {event.hyrox.map((d, i) => (
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
              hyrox={(event.hyrox[hyroxDay] || event.hyrox[0]).tactic}
              team={event.photographers.map((p) => p.acronym || p.name)}
              callTime={(event.hyrox[hyroxDay] || event.hyrox[0]).callTime}
            />
          </Section>
        ) : ((event.tactic || []).length > 0 || (event.tacticDays || []).some((d) => d.rows.length > 0)) && (
          <Section id="tactic" icon={<Target size={16} />} title="Tactic">
            {(event.tacticDays || []).length > 1 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {event.tacticDays.map((d, i) => (
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
                    const link = r.mapLink || (pos ? googleMapsUrl(pos.lat!, pos.lng!) : "");
                    return (
                      <tr
                        key={r.id}
                        style={r.color ? { background: r.color } : undefined}
                        className="border-b border-slate-100 last:border-0 align-top"
                      >
                        <td className="px-3 py-2 font-bold text-slate-900">{r.spot}</td>
                        <td className="px-3 py-2">
                          {mates.length ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {mates.map(({ a, p }) => (
                                <span key={a} className="inline-flex items-center">
                                  <span className="inline-flex h-5 min-w-10 items-center justify-center rounded bg-slate-900 px-1.5 text-[11px] font-bold text-white">
                                    {a}
                                  </span>
                                  {p?.name && (
                                    <span className="ml-1 whitespace-nowrap font-bold text-slate-900">{p.name}</span>
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
                        <td className="px-3 py-2 whitespace-nowrap font-bold text-slate-900">{r.lens || "—"}</td>
                        {!isFitnessIndoor && (
                          <td className="px-3 py-2 whitespace-nowrap font-bold text-slate-900">
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
                        <td className="px-3 py-2 text-slate-900">{r.note || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            <CourseMap legs={legs} positions={event.positions} height={320} />
          </Section>
        )}

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

        {/* Hotel + Team — side by side on desktop */}
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Hotels */}
        {event.hotels.some((ht) => ht.name) && (
          <Section id="hotel" icon={<BedDouble size={16} />} title={event.hotels.length > 1 ? "Hotels" : "Hotel"}>
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
          <Section id="team" icon={<Camera size={16} />} title="Team" defaultOpen={false}>
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
          Sportograf TL Tool · One event. One source of truth.
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
      {imgIndex !== null && images[imgIndex] && (
        <Lightbox files={images} index={imgIndex} onClose={() => setImgIndex(null)} onNavigate={setImgIndex} />
      )}
    </div>
  );
}
