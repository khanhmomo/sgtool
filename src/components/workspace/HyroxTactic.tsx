"use client";

import { useEffect, useRef, useState } from "react";
import { AlarmClock, AlertTriangle, BookOpen, Copy, Download, Plus, Trash2, Users, X } from "lucide-react";
import { Button, Card, CardHeader, Input, Textarea } from "@/components/ui";
import { cn, fmtDate, uid } from "@/lib/utils";
import Markdown from "@/components/Markdown";
import type { HyroxBreakRange, HyroxBreakTable, HyroxDayPlan, HyroxStationPlan, HyroxSwitchGroup, HyroxTactic, TemplateDTO } from "@/types";
import type { TabProps } from "./EventWorkspace";

/** Fixed HYROX stations — never reordered or renamed by the user */
export const HYROX_STATIONS = [
  "SkiErg",
  "Sled Push",
  "Sled Pull",
  "Burpees (optional)",
  "Rowing",
  "Farmers Carry",
  "Sandbag Lunges",
  "Wall Ball",
  "Finish",
  "Hero Wall",
  "LS Arch",
];

/** External-crew stations — photographer chips are LS crew, no breaks/cover.
    Tolerant match: saved station names may differ in case/spacing/apostrophes */
const isExternal = (s: string) => /farmers?['\u2019]?\s*carry/i.test(s) || /ls\s*arch/i.test(s);

/** Row background per station (public view) — plain white for a clean read */
const STATION_PASTEL: Record<string, string> = Object.fromEntries(
  HYROX_STATIONS.map((s) => [s, "bg-white"])
);

/** Stations 1-3 self-manage their breaks (no jumper cover) */
const BREAK_STATIONS = HYROX_STATIONS.slice(0, 3);

type BreakRange = HyroxBreakRange;

/** breaks may be stored as a legacy free-text string or an array of ranges — normalize on load */
const normBreaks = (b: string | BreakRange[]): BreakRange[] =>
  Array.isArray(b) ? b : b ? [{ start: b, end: "" }] : [];

const blankStation = (station: string): HyroxStationPlan => ({
  station,
  photographers: [],
  ls: [],
  breaks: [],
  cover: [],
  note: "",
});

/** Chip list + drop target used in Photographers / Cover cells */
function NameCell({
  values,
  onDropName,
  onRemove,
  chipClass,
  droppable = true,
  onDragChip,
}: {
  values: string[];
  onDropName: (name: string) => void;
  onRemove: (name: string) => void;
  chipClass: (v: string) => string;
  droppable?: boolean;
  /** Called when a chip inside this cell starts being dragged (move, not copy) */
  onDragChip?: (name: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={droppable ? (e) => {
        e.preventDefault();
        setOver(true);
      } : undefined}
      onDragLeave={droppable ? () => setOver(false) : undefined}
      onDrop={droppable ? (e) => {
        e.preventDefault();
        setOver(false);
        const name = e.dataTransfer.getData("text/plain").trim();
        if (name) onDropName(name);
      } : undefined}
      className={cn(
        "flex h-full min-h-7 w-full flex-wrap items-center gap-1 rounded px-1 py-0.5",
        over && "bg-blue-50 ring-1 ring-blue-300"
      )}
    >
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          draggable={!!onDragChip}
          onDragStart={onDragChip ? (e) => {
            e.stopPropagation();
            e.dataTransfer.setData("text/plain", v);
            e.dataTransfer.effectAllowed = "move";
            onDragChip(v);
          } : undefined}
          className={cn("group inline-flex h-5 items-center gap-0.5 rounded px-1.5 text-[11px] font-bold text-white", chipClass(v), onDragChip && "cursor-grab active:cursor-grabbing")}
        >
          {v}
          <button
            onClick={() => onRemove(v)}
            className="hidden text-white/70 hover:text-white group-hover:inline"
            title="Remove"
          >
            ×
          </button>
        </span>
      ))}
      {values.length === 0 && droppable && <span className="text-[11px] text-slate-300">drop here</span>}
    </div>
  );
}

const defaultTactic = (): HyroxTactic => ({
  shifts: [HYROX_STATIONS.map(blankStation)],
  switchGroups: [],
  breaks: [],
});

/** Add/Edit button that opens a briefing-style note editor with Bookshelf import */
function NoteEditor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateDTO[] | null>(null);

  useEffect(() => {
    if (!importOpen || templates !== null) return;
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]));
  }, [importOpen, templates]);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={cn(
          "mt-0.5 block rounded px-1.5 py-0.5 text-[10px] font-medium",
          value.trim() ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        )}
      >
        {value.trim() ? `Edit ${label}` : `+ Add ${label}`}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-bold text-slate-700">{label}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setImportOpen((v) => !v)}>
                  <BookOpen size={13} /> Import from Bookshelf
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  <X size={15} />
                </Button>
              </div>
            </div>
            {importOpen && (
              <div className="max-h-56 overflow-y-auto border-b border-slate-100 px-4 py-3">
                {templates === null ? (
                  <p className="text-xs text-slate-400">Loading templates…</p>
                ) : templates.length === 0 ? (
                  <p className="text-xs text-slate-400">No templates yet — create some in your Bookshelf first.</p>
                ) : (
                  <div className="grid gap-1.5">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { onChange(t.body); setImportOpen(false); }}
                        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50/50"
                      >
                        <Download size={13} className="shrink-0 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-800">{t.title}</span>
                          <span className="block truncate text-xs text-slate-400">
                            {t.body.replace(/[#*\-[\]]/g, "").trim().slice(0, 80)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 overflow-auto p-4">
              <Textarea
                rows={12}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={"# Note\n\n- Details…"}
                className="font-mono text-xs"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Supports # headings, - bullets, **bold**, [links](url).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const fmtT = (t: string) => {
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return t;
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

/** Read-only tactic view for the photographer site */
export function HyroxPublicView({ hyrox, team, callTime, dayNote }: { hyrox: HyroxTactic; team?: string[]; callTime?: string; dayNote?: string }) {
  const shifts = hyrox.shifts || [];
  const groups = hyrox.switchGroups || [];
  const breaks = hyrox.breaks || [];
  const maxP = Math.max(0, ...groups.map((g) => g.photographers.length));
  const teamSet = new Set(team || []);
  const chip = (v: string, cls: string) =>
    teamSet.has(v) ? `text-white ${cls}` : "bg-amber-400 text-slate-900";
  return (
    <div className="space-y-4">
      {callTime && (
        <div className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFED00]">Call time</span>
          <span className="text-sm font-black text-[#FFED00]">{fmtT(callTime)}</span>
        </div>
      )}
      {dayNote?.trim() && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <Markdown text={dayNote} />
        </div>
      )}
      {shifts.map((stations, si) => (
        <div key={si}>
          {shifts.length > 1 && (
            <p className="mb-1.5 text-sm font-black uppercase tracking-wider text-slate-900">
              Shift {si + 1}
            </p>
          )}
          <div className="hidden overflow-x-auto rounded-md border border-slate-900 sm:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#FFED00] text-[10px] uppercase tracking-wider text-slate-900">
                  <th className="border border-slate-900 px-3 py-2">Station</th>
                  <th className="border border-slate-900 px-3 py-2">Photographers</th>
                  <th className="border border-slate-900 px-3 py-2">Breaks</th>
                  <th className="border border-slate-900 px-3 py-2">Cover</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((st) => (
                  <tr
                    key={st.station}
                    className={cn("align-top text-slate-900", STATION_PASTEL[st.station] || "bg-slate-50")}
                  >
                    <td className="border border-slate-900 px-3 py-2 font-bold whitespace-nowrap">
                      {st.station}
                      {st.note && <div className="mt-0.5 whitespace-normal text-[10px] font-normal text-slate-600"><Markdown text={st.note} /></div>}
                    </td>
                    <td className="border border-slate-900 px-3 py-2">
                      {st.photographers.length || (st.ls || []).length ? (
                        <div className="flex flex-wrap gap-1">
                          {st.photographers.map((p, i) => (
                            <span key={i} className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold", isExternal(st.station) ? "bg-amber-400 text-slate-900" : chip(p, "bg-green-600"))}>{isExternal(st.station) || !teamSet.has(p) ? `${p} LS` : p}</span>
                          ))}
                          {(st.ls || []).map((p, i) => (
                            <span key={`ls-${i}`} className="inline-flex h-5 items-center rounded bg-amber-400 px-1.5 text-[11px] font-bold text-slate-900">{p} LS</span>
                          ))}
                        </div>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                    <td className="border border-slate-900 px-3 py-2 font-bold whitespace-nowrap">
                      {(st.breaks || []).length
                        ? (st.breaks as HyroxBreakRange[]).map((b, i) => (
                            <div key={i}>{fmtT(b.start)} – {fmtT(b.end)}</div>
                          ))
                        : <span className="font-normal opacity-40">—</span>}
                    </td>
                    <td className="border border-slate-900 px-3 py-2">
                      {st.cover.length ? (
                        <div className="flex flex-wrap gap-1">
                          {st.cover.map((c, i) => (
                            <span key={i} className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold", chip(c, "bg-blue-600"))}>{c}</span>
                          ))}
                        </div>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: stacked station cards */}
          <div className="space-y-1.5 sm:hidden">
            {stations.map((st) => (
              <div key={st.station} className={cn("rounded-md border border-slate-900 p-2.5 text-slate-900", STATION_PASTEL[st.station] || "bg-slate-50")}>
                <p className="mb-1 text-xs font-black uppercase tracking-wide">{st.station}</p>
                {st.note && <div className="mb-1 text-[10px] font-normal text-slate-600"><Markdown text={st.note} /></div>}
                <div className="grid grid-cols-[1fr_1fr_auto] gap-x-2">
                  {/* Col 1: photographers / LS */}
                  <div className="flex flex-wrap items-start gap-1">
                    {st.photographers.length || (st.ls || []).length
                      ? <>
                          {st.photographers.map((p, i) => (
                            <span key={i} className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold", isExternal(st.station) ? "bg-amber-400 text-slate-900" : chip(p, "bg-green-600"))}>
                              {isExternal(st.station) || !teamSet.has(p) ? `${p} LS` : p}
                            </span>
                          ))}
                          {(st.ls || []).map((p, i) => (
                            <span key={`ls-${i}`} className="inline-flex h-5 items-center rounded bg-amber-400 px-1.5 text-[11px] font-bold text-slate-900">{p} LS</span>
                          ))}
                        </>
                      : <span className="text-[11px] opacity-40">—</span>}
                  </div>
                  {/* Col 2: cover — spans into col 3 when no breaks */}
                  <div className="flex flex-wrap items-start gap-1">
                    {st.cover.length > 0 && (
                      <>
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Cover</span>
                        {st.cover.map((c, i) => (
                          <span key={i} className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold", chip(c, "bg-blue-600"))}>{c}</span>
                        ))}
                      </>
                    )}
                  </div>
                  {/* Col 3: break times, one per line */}
                  {(st.breaks || []).length > 0 && (
                    <div className="flex flex-col items-end gap-0.5 border-l border-slate-900/20 pl-2 text-right">
                      {(st.breaks as HyroxBreakRange[]).map((b, bi) => (
                        <span key={bi} className="whitespace-nowrap text-[10px] font-bold opacity-80">
                          {fmtT(b.start)}–{fmtT(b.end)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {groups.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Switch schedule</p>
          <div className="hidden overflow-x-auto rounded-md border border-slate-900 sm:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#FFED00] text-[10px] uppercase tracking-wider text-slate-900">
                  <th className="border border-slate-900 px-3 py-2">Group</th>
                  {Array.from({ length: maxP }).map((_, i) => (
                    <th key={i} className="border border-slate-900 px-3 py-2">Photo {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id} className="bg-white text-slate-900">
                    <td className="border border-slate-900 bg-[#FFED00] px-3 py-2 font-bold">{g.name}</td>
                    {Array.from({ length: maxP }).map((_, i) => (
                      <td key={i} className="border border-slate-900 px-3 py-2 font-bold">{g.photographers[i] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: stacked group cards */}
          <div className="space-y-1.5 sm:hidden">
            {groups.map((g) => (
              <div key={g.id} className="rounded-md border border-slate-900 bg-white p-2.5">
                <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-900">
                  <span className="rounded bg-[#FFED00] px-1.5 py-0.5">{g.name}</span>
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-bold text-slate-900">
                  {g.photographers.map((p, i) => (
                    <span key={i}><span className="text-[9px] font-bold uppercase opacity-60">P{i + 1}</span> {p || "—"}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Photo 1 moves to Photo 2&apos;s station, 2 → 3, and so on.</p>
          {hyrox.switchNote && (
            <div className="mt-2 rounded-md border border-slate-900 bg-amber-50 p-2.5 text-xs text-slate-900">
              <Markdown text={hyrox.switchNote} />
            </div>
          )}
        </div>
      )}

      {breaks.some((t) => (t?.times?.length || 0) > 0) && (
        <div className="space-y-4">
          {breaks.map((t, si) =>
            t?.times?.length ? (
              <div key={si}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Break schedule — stations 1–3{shifts.length > 1 ? ` (Shift ${si + 1})` : ""}
                </p>
                <div className="hidden overflow-x-auto rounded-md border border-slate-900 sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#FFED00] text-[10px] uppercase tracking-wider text-slate-900">
                        <th className="border border-slate-900 px-3 py-2">Station</th>
                        {t.times.map((b, bi) => (
                          <th key={bi} className="border border-slate-900 px-3 py-2 whitespace-nowrap">
                            {fmtT(b.start)}–{fmtT(b.end)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {BREAK_STATIONS.map((station) => (
                        <tr
                          key={station}
                          className={cn("text-slate-900", STATION_PASTEL[station] || "bg-slate-50")}
                        >
                          <td className="border border-slate-900 px-3 py-2 font-bold whitespace-nowrap">
                            {station}
                          </td>
                          {t.times.map((_, bi) => (
                            <td key={bi} className="border border-slate-900 px-3 py-2 font-bold">
                              {(t.rows?.[station] || [])[bi] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile: stacked station cards, one line per break */}
                <div className="space-y-1.5 sm:hidden">
                  {BREAK_STATIONS.map((station) => (
                    <div
                      key={station}
                      className={cn(
                        "rounded-md border border-slate-900 p-2.5 text-slate-900",
                        STATION_PASTEL[station] || "bg-slate-50"
                      )}
                    >
                      <p className="mb-1 text-xs font-black uppercase tracking-wide">
                        <span className="rounded bg-[#FFED00] px-1.5 py-0.5">{station}</span>
                      </p>
                      <div className="space-y-0.5 text-xs font-bold">
                        {t.times.map((b, bi) => (
                          <div key={bi} className="flex items-baseline gap-2">
                            <span className="shrink-0 whitespace-nowrap opacity-80">
                              {fmtT(b.start)}–{fmtT(b.end)}
                            </span>
                            <span>{(t.rows?.[station] || [])[bi] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
          {hyrox.breakNote && (
            <div className="rounded-md border border-slate-900 bg-amber-50 p-2.5 text-xs text-slate-900">
              <Markdown text={hyrox.breakNote} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Normalize stored breaks (legacy free-text → ranges) inside a tactic */
const normBreakTables = (b: unknown): HyroxBreakTable[] => {
  if (!Array.isArray(b)) return [];
  if (!b.length) return [];
  // legacy flat HyroxBreak[] → single table grouped by time window
  if (typeof b[0] === "object" && b[0] && "station" in b[0]) {
    const legacy = b as { station: string; photographer: string; start: string; end: string }[];
    const times: HyroxBreakRange[] = [];
    const rows: Record<string, string[]> = {};
    for (const l of legacy) {
      let bi = times.findIndex((t) => t.start === l.start && t.end === l.end);
      if (bi < 0) { times.push({ start: l.start, end: l.end }); bi = times.length - 1; }
      (rows[l.station] ||= [])[bi] = l.photographer;
    }
    return [{ times, rows }];
  }
  return b as HyroxBreakTable[];
};

const normTactic = (t: HyroxTactic): HyroxTactic => ({
  ...t,
  shifts: (t.shifts || []).map((sh) => {
    const rows = sh.map((st) => ({
      ...st,
      ls: Array.isArray(st.ls) ? st.ls : [],
      breaks: normBreaks(st.breaks as unknown as string | BreakRange[]),
    }));
    // append any fixed stations added after this tactic was saved (e.g. "LS Arch")
    for (const s of HYROX_STATIONS) {
      if (!rows.some((r) => r.station === s)) rows.push(blankStation(s));
    }
    return rows;
  }),
  breaks: normBreakTables(t.breaks),
});

/** Inclusive YYYY-MM-DD range — built from local date parts, never toISOString
 *  (UTC conversion would shift the day for editors in timezones ahead of UTC). */
function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start) return out;
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${(end && end >= start ? end : start)}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  for (let i = 0; i < 60 && d <= last; i++) {
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function HyroxTactic({ event, patch, saving }: TabProps) {
  const [days, setDays] = useState<HyroxDayPlan[]>(() => {
    // Days cover the event's start→end range PLUS any saved hyrox dates — saved
    // days outside the range are kept (marked "outside event") so data is never
    // silently hidden when the event dates change after a tactic was saved.
    const range = dateRange(event.date.slice(0, 10), (event.endDate || "").slice(0, 10));
    const saved = (event.hyrox || []).map((d) => d.date).filter(Boolean);
    const dates = [...range, ...saved];
    return [...new Set(dates)].sort().map((date) => ({
      date,
      callTime: event.hyrox?.find((x) => x.date === date)?.callTime || "",
      tactic: normTactic(event.hyrox?.find((x) => x.date === date)?.tactic || defaultTactic()),
    }));
  });
  const [activeDate, setActiveDate] = useState(days[0]?.date || "");
  /** Shift index whose break schedule is open in the fullscreen editor, or null */
  const [breakEdit, setBreakEdit] = useState<number | null>(null);

  const day = days.find((d) => d.date === activeDate);
  const tactic = day?.tactic || defaultTactic();

  // Saves write only days inside the event date range — out-of-range saved days
  // stay visible (amber pill) for recovery but can't be re-persisted.
  const saveDays = (nextDays: HyroxDayPlan[]) => {
    const start = event.date.slice(0, 10);
    const end = (event.endDate || "").slice(0, 10);
    const persisted = start
      ? nextDays.filter((d) => d.date >= start && (!end || d.date <= end))
      : nextDays;
    patch({ hyrox: persisted });
  };

  const setCallTime = (v: string) => {
    const nextDays = days.map((d) => (d.date === activeDate ? { ...d, callTime: v } : d));
    setDays(nextDays);
    saveDays(nextDays);
  };

  const setDayNote = (v: string) => {
    const nextDays = days.map((d) => (d.date === activeDate ? { ...d, note: v } : d));
    setDays(nextDays);
    saveDays(nextDays);
  };

  // Every change auto-saves — no explicit save button
  const touch = (next: HyroxTactic) => {
    const nextDays = days.map((d) => (d.date === activeDate ? { ...d, tactic: next } : d));
    setDays(nextDays);
    saveDays(nextDays);
  };

  /** Clone another day's tactic into the active day — shifts, switch groups, breaks */
  const cloneDay = (fromDate: string) => {
    const src = days.find((d) => d.date === fromDate);
    if (!src || fromDate === activeDate) return;
    const cloned: HyroxTactic = JSON.parse(JSON.stringify(src.tactic));
    // Fresh ids so edits to cloned switch groups never touch the source day
    cloned.switchGroups = cloned.switchGroups.map((g) => ({ ...g, id: uid() }));
    touch(cloned);
  };

  /** Clone one shift's station plan + its break table into another shift */
  const cloneShift = (toIdx: number, fromIdx: number) => {
    const shifts = tactic.shifts.map((sh, i) =>
      i === toIdx ? JSON.parse(JSON.stringify(tactic.shifts[fromIdx])) : sh
    );
    const breaks = [...tactic.breaks];
    if (tactic.breaks[fromIdx]) breaks[toIdx] = JSON.parse(JSON.stringify(tactic.breaks[fromIdx]));
    touch({ ...tactic, shifts, breaks });
  };

  const setShiftStation = (shiftIdx: number, stationIdx: number, patch2: Partial<HyroxStationPlan>) =>
    touch({
      ...tactic,
      shifts: tactic.shifts.map((sh, i) =>
        i === shiftIdx ? sh.map((st, j) => (j === stationIdx ? { ...st, ...patch2 } : st)) : sh
      ),
    });

  const addShift = () => touch({ ...tactic, shifts: [...tactic.shifts, HYROX_STATIONS.map(blankStation)] });
  const removeShift = (i: number) => touch({ ...tactic, shifts: tactic.shifts.filter((_, x) => x !== i) });

  const addGroup = () =>
    touch({ ...tactic, switchGroups: [...tactic.switchGroups, { id: uid(), name: `Group ${tactic.switchGroups.length + 1}`, photographers: [""] }] });
  const updateGroup = (id: string, p: Partial<HyroxSwitchGroup>) =>
    touch({ ...tactic, switchGroups: tactic.switchGroups.map((g) => (g.id === id ? { ...g, ...p } : g)) });
  const removeGroup = (id: string) =>
    touch({ ...tactic, switchGroups: tactic.switchGroups.filter((g) => g.id !== id) });

  // Break tables indexed by shift — columns are break windows, rows are stations 1-3
  const breakTable = (si: number): HyroxBreakTable =>
    tactic.breaks[si] || { times: [], rows: {} };
  const setBreakTable = (si: number, t: HyroxBreakTable) => {
    const breaks = [...tactic.breaks];
    breaks[si] = t;
    touch({ ...tactic, breaks });
  };
  const addBreakCol = (si: number) => {
    const t = breakTable(si);
    const rows: Record<string, string[]> = {};
    for (const [s, r] of Object.entries(t.rows || {})) rows[s] = [...(r || []), ""];
    setBreakTable(si, { times: [...(t.times || []), { start: "", end: "" }], rows });
  };
  const removeBreakCol = (si: number, bi: number) => {
    const t = breakTable(si);
    const rows: Record<string, string[]> = {};
    for (const [s, r] of Object.entries(t.rows || {})) rows[s] = (r || []).filter((_, i) => i !== bi);
    setBreakTable(si, { times: (t.times || []).filter((_, i) => i !== bi), rows });
  };
  const setBreakTime = (si: number, bi: number, p: Partial<HyroxBreakRange>) => {
    const t = breakTable(si);
    setBreakTable(si, { ...t, times: (t.times || []).map((x, i) => (i === bi ? { ...x, ...p } : x)) });
  };
  const setBreakCell = (si: number, station: string, bi: number, name: string) => {
    const t = breakTable(si);
    const row = [...(t.rows?.[station] || [])];
    row[bi] = name;
    setBreakTable(si, { ...t, rows: { ...(t.rows || {}), [station]: row } });
  };

  const removeName = (si: number, sti: number, key: "photographers" | "cover" | "ls", name: string) =>
    setShiftStation(si, sti, { [key]: tactic.shifts[si][sti][key].filter((n) => n !== name) });

  /** Source cell of a chip currently being dragged — null when dragging from the Team pool */
  const dragSrcRef = useRef<{ si: number; sti: number; key: "photographers" | "cover" | "ls" } | null>(null);

  /**
   * Drop a name into a cell. If it was dragged out of another cell, it is MOVED —
   * removed from the source and added to the target in a single update so dedupe
   * checks see the post-removal state (e.g. moving within one shift).
   */
  const dropName = (si: number, sti: number, key: "photographers" | "cover" | "ls", name: string) => {
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    if (src && src.si === si && src.sti === sti && src.key === key) return; // dropped back where it was
    const shifts = tactic.shifts.map((sh) =>
      sh.map((st) => ({ ...st, photographers: [...st.photographers], cover: [...st.cover], ls: [...(st.ls || [])] }))
    );
    if (src) {
      const arr = shifts[src.si][src.sti][src.key];
      const i = arr.indexOf(name);
      if (i >= 0) arr.splice(i, 1);
    }
    const shift = shifts[si];
    // Same dedupe rules as addName — on failure the move is rejected (source keeps the chip)
    if (key === "photographers") {
      const hit = isExternal(shift[sti].station)
        ? shift[sti].photographers.includes(name)
        : shift.some((s) => s.photographers.includes(name));
      if (hit) return;
    } else if (key === "ls") {
      if (shift.some((s) => (s.ls || []).includes(name))) return;
    } else if (shift[sti].cover.includes(name)) {
      return;
    }
    shift[sti][key].push(name);
    touch({ ...tactic, shifts });
  };

  const maxP = Math.max(1, ...tactic.switchGroups.map((g) => g.photographers.length));

  // Pool status: assigned to a station → green, covering → blue, free → grey
  const assignedSet = new Set(tactic.shifts.flat().flatMap((s) => [...s.photographers, ...(s.ls || [])]));
  const coveringSet = new Set(tactic.shifts.flat().flatMap((s) => s.cover));
  /** Team acronym/name tags — anything else in a cell is an external (LS) */
  const teamTags = new Set(event.photographers.map((p) => p.acronym || p.name));

  // Rotation alerts — same photographer on the same station across different days.
  // Recomputed on every render, so alerts appear/disappear in real time.
  const stationDates = new Map<string, Set<string>>();
  for (const d of days) {
    for (const shift of d.tactic?.shifts || []) {
      for (const st of shift) {
        for (const n of [...st.photographers, ...st.cover]) {
          if (!n) continue;
          const key = `${n}@@${st.station}`;
          const s = stationDates.get(key) || new Set<string>();
          s.add(d.date);
          stationDates.set(key, s);
        }
      }
    }
  }
  const dupAlerts: { name: string; station: string; dates: string[] }[] = [];
  for (const [key, dates] of stationDates) {
    if (dates.size > 1) {
      const [name, station] = key.split("@@");
      dupAlerts.push({ name, station, dates: [...dates].sort() });
    }
  }
  dupAlerts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Day selector — each HYROX day has its own tactic */}
      {days.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Day:</span>
          {days.map((d) => {
            const inRange =
              d.date >= event.date.slice(0, 10) &&
              (!event.endDate || d.date <= event.endDate.slice(0, 10));
            return (
              <button
                key={d.date}
                onClick={() => setActiveDate(d.date)}
                title={inRange ? undefined : "Outside event dates — copy it into an event day with 'Copy day from…'"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold",
                  d.date === activeDate
                    ? "bg-slate-900 text-white"
                    : inRange
                      ? "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                      : "bg-amber-50 text-amber-700 ring-1 ring-dashed ring-amber-300 hover:bg-amber-100"
                )}
              >
                {fmtDate(d.date)}
                {!inRange && " *"}
              </button>
            );
          })}
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500">
            Call time
            <Input
              type="time"
              value={day?.callTime || ""}
              onChange={(e) => setCallTime(e.target.value)}
              className="h-7 w-24 px-1.5 text-xs"
            />
          </span>
          {days.length > 1 && (
            <label className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
              <Copy size={12} className="text-blue-500" />
              <select
                value=""
                onChange={(e) => e.target.value && cloneDay(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="">Copy day from…</option>
                {days
                  .filter((d) => d.date !== activeDate)
                  .map((d) => (
                    <option key={d.date} value={d.date}>
                      {fmtDate(d.date)}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <button
            onClick={() => touch(defaultTactic())}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Clear this day's tactic"
          >
            <Trash2 size={13} /> Clear day
          </button>
        </div>
      )}
      <div className="flex items-start gap-4">
      <div key={activeDate} className="min-w-0 flex-1 space-y-4">
      {tactic.shifts.map((stations, si) => (
        <Card key={si}>
          <CardHeader
            title={`Shift ${si + 1}`}
            icon={<Users size={15} className="text-blue-600" />}
            action={
              <div className="flex items-center gap-2">
                {si > 0 && (
                  <label className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                    <Copy size={11} className="text-blue-500" />
                    <select
                      value=""
                      onChange={(e) => e.target.value !== "" && cloneShift(si, Number(e.target.value))}
                      className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                    >
                      <option value="">Copy from…</option>
                      {tactic.shifts.map((_, other) =>
                        other !== si ? (
                          <option key={other} value={other}>
                            Shift {other + 1}
                          </option>
                        ) : null
                      )}
                    </select>
                  </label>
                )}
                {tactic.shifts.length < 2 && si === tactic.shifts.length - 1 && (
                  <Button size="sm" variant="outline" onClick={addShift}>
                    <Plus size={14} /> Shift 2
                  </Button>
                )}
                {si === 1 && (
                  <Button size="sm" variant="ghost" onClick={() => removeShift(si)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 w-44">Station</th>
                  <th className="px-2 py-2">Photographers</th>
                  <th className="px-2 py-2">Breaks</th>
                  <th className="px-2 py-2 w-40">Cover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stations.map((st, sti) => (
                  <tr key={st.station}>
                    <td className="px-4 py-1.5 font-medium text-slate-700">
                      {st.station}
                      <NoteEditor
                        label="Note"
                        value={st.note || ""}
                        onChange={(v) => setShiftStation(si, sti, { note: v })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {isExternal(st.station) ? (
                        /* External crew — whole cell is an LS drop zone; assigned members allowed */
                        <NameCell
                          values={st.photographers}
                          onDropName={(n) => dropName(si, sti, "photographers", n)}
                          onRemove={(n) => removeName(si, sti, "photographers", n)}
                          onDragChip={() => { dragSrcRef.current = { si, sti, key: "photographers" }; }}
                          chipClass={() => "bg-amber-400 !text-slate-900"}
                        />
                      ) : st.station === "Finish" ? (
                        /* Split cell: photographers zone | LS zone */
                        <div className="grid grid-cols-2 divide-x divide-slate-200">
                          <div className="pr-2">
                            <NameCell
                              values={st.photographers}
                              onDropName={(n) => dropName(si, sti, "photographers", n)}
                              onRemove={(n) => removeName(si, sti, "photographers", n)}
                              onDragChip={() => { dragSrcRef.current = { si, sti, key: "photographers" }; }}
                              chipClass={(v) => (teamTags.has(v) ? "bg-green-600" : "bg-amber-400 !text-slate-900")}
                            />
                          </div>
                          <div className="pl-2">
                            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">LS</p>
                            <NameCell
                              values={st.ls || []}
                              onDropName={(n) => dropName(si, sti, "ls", n)}
                              onRemove={(n) => removeName(si, sti, "ls", n)}
                              onDragChip={() => { dragSrcRef.current = { si, sti, key: "ls" }; }}
                              chipClass={() => "bg-amber-400 !text-slate-900"}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <NameCell
                            values={st.photographers}
                            onDropName={(n) => dropName(si, sti, "photographers", n)}
                            onRemove={(n) => removeName(si, sti, "photographers", n)}
                            onDragChip={() => { dragSrcRef.current = { si, sti, key: "photographers" }; }}
                            chipClass={(v) => (teamTags.has(v) ? "bg-green-600" : "bg-amber-400 !text-slate-900")}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isExternal(st.station) ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                      <div className="space-y-1">
                        {normBreaks(st.breaks as unknown as string | BreakRange[]).map((br, bi) => (
                          <div key={bi} className="flex items-center gap-1">
                            <Input
                              type="time"
                              value={br.start}
                              className="w-24"
                              onChange={(e) => {
                                const breaks = normBreaks(st.breaks as unknown as string | BreakRange[]).map((x, i) =>
                                  i === bi ? { ...x, start: e.target.value } : x
                                );
                                setShiftStation(si, sti, { breaks });
                              }}
                            />
                            <span className="text-xs text-slate-400">–</span>
                            <Input
                              type="time"
                              value={br.end}
                              className="w-24"
                              onChange={(e) => {
                                const breaks = normBreaks(st.breaks as unknown as string | BreakRange[]).map((x, i) =>
                                  i === bi ? { ...x, end: e.target.value } : x
                                );
                                setShiftStation(si, sti, { breaks });
                              }}
                            />
                            <button
                              title="Remove break"
                              onClick={() =>
                                setShiftStation(si, sti, {
                                  breaks: normBreaks(st.breaks as unknown as string | BreakRange[]).filter((_, i) => i !== bi),
                                })
                              }
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          title="Add break"
                          onClick={() =>
                            setShiftStation(si, sti, {
                              breaks: [...normBreaks(st.breaks as unknown as string | BreakRange[]), { start: "", end: "" }],
                            })
                          }
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Plus size={12} /> break
                        </button>
                      </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isExternal(st.station) ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <NameCell
                          values={st.cover}
                          onDropName={(n) => dropName(si, sti, "cover", n)}
                          onRemove={(n) => removeName(si, sti, "cover", n)}
                          onDragChip={() => { dragSrcRef.current = { si, sti, key: "cover" }; }}
                          chipClass={(v) => (teamTags.has(v) ? "bg-blue-600" : "bg-amber-400 !text-slate-900")}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader
          title="Switch schedule"
          icon={<Users size={15} className="text-blue-600" />}
          action={<Button size="sm" variant="outline" onClick={addGroup}><Plus size={14} /> Group</Button>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2 w-32">Group</th>
                {Array.from({ length: maxP }).map((_, i) => (
                  <th key={i} className="px-2 py-2">Photographer {i + 1}</th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tactic.switchGroups.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-1.5">
                    <Input value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} />
                  </td>
                  {Array.from({ length: maxP }).map((_, i) => (
                    <td key={i} className="px-2 py-1.5">
                      <Input
                        defaultValue={g.photographers[i] || ""}
                        onBlur={(e) => {
                          const photographers = [...g.photographers];
                          photographers[i] = e.target.value.trim();
                          // keep array dense but allow trailing blanks
                          while (photographers.length > 1 && !photographers[photographers.length - 1]) photographers.pop();
                          updateGroup(g.id, { photographers: photographers.length ? photographers : [""] });
                        }}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex items-center gap-1">
                      <button
                        title="Add photographer column"
                        onClick={() => updateGroup(g.id, { photographers: [...g.photographers, ""] })}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100"
                      >
                        <Plus size={14} />
                      </button>
                      <button title="Remove group" onClick={() => removeGroup(g.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tactic.switchGroups.length > 0 && (
          <p className="px-4 pb-3 text-xs text-slate-400">
            Photographer 1 moves to Photographer 2&apos;s station, 2 → 3, and so on — the last in each group stays put.
          </p>
        )}
        <div className="px-4 pb-4">
          <NoteEditor
            label="Instruction"
            value={tactic.switchNote || ""}
            onChange={(v) => touch({ ...tactic, switchNote: v })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Break schedule — Stations 1–3 (self-managed, no jumper cover)"
          icon={<Users size={15} className="text-blue-600" />}
        />
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
          {tactic.shifts.map((_, si) => (
            <Button key={si} variant="outline" size="sm" onClick={() => setBreakEdit(si)}>
              Edit breaks{tactic.shifts.length > 1 ? ` — Shift ${si + 1}` : ""}
            </Button>
          ))}
          <NoteEditor
            label="Instruction"
            value={tactic.breakNote || ""}
            onChange={(v) => touch({ ...tactic, breakNote: v })}
          />
        </div>
      </Card>

      {/* Day note — same editor style as the briefing */}
      <Card>
        <CardHeader
          title={`Day note — ${fmtDate(activeDate)}`}
          icon={<AlarmClock size={15} className="text-blue-600" />}
        />
        <div className="px-4 pb-4">
          <Textarea
            rows={4}
            value={day?.note || ""}
            onChange={(e) => setDayNote(e.target.value)}
            placeholder={"# Day note\n\n- Meet 08:00 at the east gate…\n- Lunch 12:00–13:00…"}
            className="font-mono text-xs"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Supports # headings, - bullets, **bold**, [links](url). Shown on the photographer page for this day.
          </p>
          {day?.note?.trim() && (
            <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
              <Markdown text={day.note} />
            </div>
          )}
        </div>
      </Card>

      {/* Fullscreen break-schedule editor */}
      {breakEdit !== null && (() => {
        const si = breakEdit;
        const t = breakTable(si);
        const times = t.times || [];
        const rows = t.rows || {};
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-bold text-slate-700">
                  Break schedule — Stations 1–3{tactic.shifts.length > 1 ? ` (Shift ${si + 1})` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => addBreakCol(si)}>
                    <Plus size={12} className="mr-1" /> break
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setBreakEdit(null)}>
                    <X size={15} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-hidden p-4">
                <div className="min-h-0 flex-1 overflow-auto">
                {times.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-max min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                          <th className="sticky left-0 z-10 w-24 bg-slate-50 px-1 py-0.5 shadow-[1px_0_0_0_#e2e8f0]">Station</th>
                          {times.map((br, bi) => (
                            <th key={bi} className="px-0.5 py-0.5">
                              <div className="flex items-center">
                                <Input
                                  inputMode="numeric"
                                  placeholder="00:00"
                                  value={br.start}
                                  className="h-5 w-[38px] rounded-none p-0 text-center text-[10px]"
                                  onChange={(e) => setBreakTime(si, bi, { start: e.target.value })}
                                />
                                <span className="text-[9px] text-slate-300">–</span>
                                <Input
                                  inputMode="numeric"
                                  placeholder="00:00"
                                  value={br.end}
                                  className="h-5 w-[38px] rounded-none p-0 text-center text-[10px]"
                                  onChange={(e) => setBreakTime(si, bi, { end: e.target.value })}
                                />
                                <button
                                  title="Remove break"
                                  onClick={() => removeBreakCol(si, bi)}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {BREAK_STATIONS.map((station) => (
                          <tr key={station}>
                            <td className="sticky left-0 z-10 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-[1px_0_0_0_#e2e8f0]">
                              {station} <span className="text-[9px] font-normal text-slate-400">(optional)</span>
                            </td>
                            {times.map((_, bi) => (
                              <td key={bi} className="border-l border-slate-200 p-0">
                                <Input
                                  className="h-5 w-full rounded-none border-transparent px-1 text-[10px] focus:border-slate-300"
                                  placeholder="—"
                                  value={(rows[station] || [])[bi] || ""}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const n = e.dataTransfer.getData("text/plain");
                                    if (n) setBreakCell(si, station, bi, n);
                                  }}
                                  onChange={(e) => setBreakCell(si, station, bi, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No breaks yet — click &quot;+ break&quot; to add a column.</p>
                )}
                </div>
                {/* Break pool — members of stations 1–3 (either shift) who are not covering anyone */}
                {(() => {
                  const stationSet = new Set(BREAK_STATIONS);
                  const stationMembers = new Set(
                    tactic.shifts.flat().filter((s) => stationSet.has(s.station)).flatMap((s) => s.photographers)
                  );
                  const pool = event.photographers.filter((p) => {
                    const tag = p.acronym || p.name;
                    return stationMembers.has(tag) && !coveringSet.has(tag);
                  });
                  return pool.length > 0 ? (
                    <aside className="shrink-0 rounded-md border border-slate-200 p-1.5">
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Stations 1–3</p>
                      <div className="flex flex-wrap gap-1">
                        {pool.map((p) => {
                          const tag = p.acronym || p.name;
                          return (
                            <span
                              key={p.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("text/plain", tag)}
                              className="cursor-grab truncate rounded bg-green-600 px-1.5 py-0.5 text-left text-[10px] font-bold text-white active:cursor-grabbing"
                            >
                              {tag}
                              {p.name && p.name !== tag && (
                                <span className="block truncate text-[8px] font-medium text-white/80">{p.name}</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </aside>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      </div>
      {/* Photographer pool — sticky right column, drag onto any cell */}
      {event.photographers.length > 0 && (
        <aside className="sticky top-20 w-60 shrink-0 self-start space-y-2">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Team</p>
          <div className="grid grid-cols-2 gap-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 140px)" }}>
            {event.photographers.map((p) => {
              const tag = p.acronym || p.name;
              const covering = coveringSet.has(tag);
              const assigned = assignedSet.has(tag);
              return (
                <span
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", tag)}
                  title={covering ? "Covering (jumper)" : assigned ? "Assigned to a station" : "Drag to a station"}
                  className={cn(
                    "cursor-grab truncate rounded px-2 py-1 text-left text-[11px] font-bold text-white active:cursor-grabbing",
                    covering ? "bg-blue-600" : assigned ? "bg-green-600" : "bg-slate-400"
                  )}
                >
                  {tag}
                  {p.name && p.name !== tag && (
                    <span className="block truncate text-[9px] font-medium text-white/80">{p.name}</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
        {dupAlerts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              <AlertTriangle size={11} /> Alert — duplicate station
            </p>
            <ul className="space-y-1">
              {dupAlerts.map((a) => (
                <li
                  key={`${a.name}-${a.station}`}
                  className="rounded bg-white/80 px-1.5 py-1 text-[10px] leading-tight text-amber-900 ring-1 ring-amber-200"
                >
                  <span className="font-bold">{a.name}</span> in{" "}
                  <span className="font-semibold">{a.station}</span>
                  <span className="block text-amber-700">
                    {a.dates.map((d) => fmtDate(d)).join(" + ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        </aside>
      )}
      </div>
      {saving && <p className="text-right text-xs text-slate-400">Saving…</p>}
    </div>
  );
}
