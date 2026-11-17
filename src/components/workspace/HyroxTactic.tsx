"use client";

import { useEffect, useRef, useState } from "react";
import { AlarmClock, AlertTriangle, Aperture, BookOpen, ChevronDown, ChevronUp, Copy, Download, ExternalLink, Eye, EyeOff, Plus, Trash2, Users, X } from "lucide-react";
import { Button, Card, CardHeader, Input, Select, Textarea } from "@/components/ui";
import { cn, fmtDate, uid, dateRangeYmd } from "@/lib/utils";
import Markdown from "@/components/Markdown";
import type { HyroxBreakRange, HyroxBreakRow, HyroxBreakTable, HyroxDayPlan, HyroxStationPlan, HyroxSwitchGroup, HyroxTactic, Photographer, TemplateDTO } from "@/types";
import type { TabProps } from "./EventWorkspace";

/** Fixed HYROX stations — never reordered or renamed by the user */
export const HYROX_STATIONS = [
  "SkiErg",
  "Sled Push",
  "Sled Pull",
  "Burpees",
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

/** Numbered race stations are HYROX_STATIONS[0..7] (SkiErg=1 … Wall Ball=8);
    later entries (Finish, Hero Wall, LS Arch) are unnumbered */
/** Normalize legacy station names saved before renames (e.g. "Burpees (optional)") */
const normStation = (s: string) => s.replace(/\s*\(optional\)\s*/i, " ").replace(/\s+/g, " ").trim();

const stationLabel = (name: string) => {
  const n = normStation(name);
  const i = HYROX_STATIONS.indexOf(n);
  return i >= 0 && i < 8 ? `${i + 1}. ${n}` : n;
};

/** Row background per station (public view) — plain white for a clean read */
const STATION_PASTEL: Record<string, string> = Object.fromEntries(
  HYROX_STATIONS.map((s) => [s, "bg-white"])
);

/** ── Station fit ───────────────────────────────────────────────────────────
    Rates a photographer's lens kit against each station's focal-length needs. */
type Fit = "green" | "yellow" | "red" | "na";

/** A parsed lens: focal range + aperture info.
    Lenses slower than f/2.8 never count toward a station's coverage;
    lenses with no aperture written count but mark the cell uncertain ("!"). */
interface LensInfo { min: number; max: number; fast: boolean; apKnown: boolean; ap?: number }

/** Parse a lenses field like "16-35 f2.8, 70-200 f4, 50mm" into focal ranges.
    Handles space-separated lists too ("canonEF16-35 24-70 70-200"). */
const lensRanges = (raw?: string): LensInfo[] =>
  (raw || "")
    // Separators: ",", ";", "/" before a letter (" / Canon") — never "f/2.8" —
    // or a spaced dash " — " between items (never "70-200" which has no spaces)
    .split(/[,;\r\n]|\s*\/\s*(?=[A-Za-z])|\s+[—–-]\s+/)
    .flatMap((s) => {
      const ranges = [...s.matchAll(/(\d{2,4})\s*[-–~]\s*(\d{2,4})/g)];
      if (ranges.length > 1) {
        // Multiple lenses mashed into one item — aperture lives in the text
        // after each range, up to the next range's start.
        return ranges.map((r, i) => {
          const seg = s.slice(r.index! + r[0].length, ranges[i + 1]?.index);
          const ap = seg.match(/mm\s*f\/?(\d+(?:\.\d+)?)/i) || seg.match(/\bf\/?(\d+(?:\.\d+)?)/i) || seg.match(/\bf\s+(\d+\.\d+)/i) || seg.match(/\b(\d+\.\d+)\b/);
          return { min: Math.min(+r[1], +r[2]), max: Math.max(+r[1], +r[2]), fast: !ap || +ap[1] <= 2.8, apKnown: !!ap, ap: ap ? +ap[1] : undefined } as LensInfo;
        });
      }
      const range: [number, number] | null = ranges.length === 1
        ? [Math.min(+ranges[0][1], +ranges[0][2]), Math.max(+ranges[0][1], +ranges[0][2])]
        : (() => {
            const p = s.match(/\d{2,3}/);
            return p ? [+p[0], +p[0]] as [number, number] : null;
          })();
      if (!range) return null;
      // Aperture "f2.8" / "f/4" / "mmF4" / "f3.5-5.6" — take the widest (lowest) value;
      // \bf keeps brand letters like "RF 16" or "EF 24-70" from matching.
      // A missing aperture can't be judged, so the lens still counts.
      const ap = s.match(/mm\s*f\/?(\d+(?:\.\d+)?)/i) || s.match(/\bf\/?(\d+(?:\.\d+)?)/i) || s.match(/\bf\s+(\d+\.\d+)/i) || s.match(/\b(\d+\.\d+)\b/);
      return { min: range[0], max: range[1], fast: !ap || +ap[1] <= 2.8, apKnown: !!ap, ap: ap ? +ap[1] : undefined } as LensInfo;
    })
    .filter((x): x is LensInfo => !!x);

const hasFlash = (p?: Photographer) => !!p?.flashes?.trim() && !/^(no|none|n\/a|-|0)$/i.test(p.flashes.trim());

/** True when an f/2.8+ lens covers the [min,max] band — primes (min===max)
    count when they land inside it, zooms need real overlap. */
const covers = (lenses: LensInfo[], min: number, max: number, fastOnly = true) =>
  lenses.some((l) => (!fastOnly || l.fast) && l.min <= max && l.max >= min);

/** Equipment fit for a station; `na` = no requirement / nothing to judge */
function stationFit(station: string, lenses: LensInfo[], flash: boolean): Fit {
  const s = normStation(station);
  // Ultra-wide fallback: a fast lens starting below 16mm turns red → yellow
  const ultraWide = lenses.some((l) => l.fast && l.min < 16);
  const wide = (fit: Fit): Fit => (fit === "red" && ultraWide ? "yellow" : fit);
  if (/farmers?['’]?\s*carry|ls\s*arch/i.test(s)) return "na";
  if (/burpee/i.test(s)) return "green";
  if (/skierg/i.test(s)) return wide(covers(lenses, 16, 28) ? "green" : "red");
  if (/sled\s*push|rowing/i.test(s)) return wide(covers(lenses, 16, 35) ? "green" : "red");
  if (/sled\s*pull/i.test(s)) {
    // Green: a fast lens reaching ≥135mm; yellow: real telephoto overlap (70–135)
    if (lenses.some((l) => l.fast && l.max >= 135)) return "green";
    if (lenses.some((l) => l.fast && l.max > 70 && l.min <= 135)) return "yellow";
    return "red";
  }
  if (/sandbag/i.test(s)) return lenses.some((l) => l.fast && l.max >= 135) ? "green" : covers(lenses, 70, 135) ? "yellow" : "red";
  if (/hero\s*wall/i.test(s)) {
    // Any aperture counts; needs 16–70mm coverage + a flash
    if (covers(lenses, 16, 70, false) && flash) return "green";
    if (!covers(lenses, 16, 70, false) && lenses.some((l) => l.min < 16)) return "yellow";
    return "red";
  }
  if (/wall\s*ball|finish/i.test(s)) {
    if (!covers(lenses, 16, 70)) return wide("red");
    if (/finish/i.test(s) && !flash) return "red"; // Finish also needs a flash
    return "green";
  }
  return "na";
}

/** The lens that determined a cell's rating (green/yellow), or null for red/na */
function fitLens(station: string, lenses: LensInfo[]): LensInfo | null {
  const s = normStation(station);
  const pick = (pred: (l: LensInfo) => boolean) => lenses.find(pred) || null;
  if (/burpee/i.test(s)) return lenses[0] || null;
  if (/skierg/i.test(s)) return pick((l) => l.fast && l.min <= 28 && l.max >= 16) || pick((l) => l.fast && l.min < 16);
  if (/sled\s*push|rowing/i.test(s)) return pick((l) => l.fast && l.min <= 35 && l.max >= 16) || pick((l) => l.fast && l.min < 16);
  if (/sled\s*pull/i.test(s)) return pick((l) => l.fast && l.max >= 135) || pick((l) => l.fast && l.max > 70 && l.min <= 135);
  if (/sandbag/i.test(s)) return pick((l) => l.fast && l.max >= 135) || pick((l) => l.fast && l.min <= 135 && l.max >= 70);
  if (/hero\s*wall/i.test(s)) return pick((l) => l.min <= 70 && l.max >= 16) || pick((l) => l.min < 16);
  if (/wall\s*ball|finish/i.test(s)) return pick((l) => l.fast && l.min <= 70 && l.max >= 16) || pick((l) => l.fast && l.min < 16);
  return null;
}

const lensLabel = (l: LensInfo) =>
  `${l.min === l.max ? l.min : `${l.min}–${l.max}`}mm${l.apKnown ? ` f/${l.ap}` : ""}`;


/** Requirement note used in Station-fit tooltips */
const FIT_HINT: [RegExp, string][] = [
  [/skierg/i, "needs 16–28mm f/2.8"],
  [/sled\s*push|rowing/i, "needs 16–35mm"],
  [/sled\s*pull/i, "needs ≥135mm f/2.8"],
  [/sandbag/i, "needs ≥135mm f/2.8"],
  [/burpee/i, "any lens"],
  [/farmers|ls\s*arch/i, "no requirement"],
  [/wall\s*ball/i, "needs 16–70mm"],
  [/hero\s*wall|finish/i, "needs 16–70mm + flash"],
];
const fitHint = (s: string) => FIT_HINT.find(([re]) => re.test(s))?.[1] || "";

/** Stations shown in the Station-fit table (SkiErg…Hero Wall, minus Farmers Carry/LS Arch) */
const FIT_STATIONS = HYROX_STATIONS.slice(0, 10).filter((s) => !/farmers/i.test(s));

/** Compact header labels for the Station-fit matrix */
const FIT_SHORT: Record<string, string> = {
  "SkiErg": "Ski",
  "Sled Push": "Push",
  "Sled Pull": "Pull",
  "Sandbag Lunges": "Sandbag",
  "Wall Ball": "Wall",
  "Hero Wall": "Hero",
};

const FIT_CELL: Record<Fit, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  na: "bg-slate-200",
};

const equipList = (v?: string) => (v || "").split(/[,;\r\n]|\s*\/\s*(?=[A-Za-z])|\s+[—–-]\s+/).map((s) => s.trim()).filter(Boolean);

/** Station-fit matrix — photographers × stations, colored by lens/aperture fit.
    Used in the editor card and on the standalone /station-fit page. */
export function StationFitTable({ photographers, withEquipment, fillCells }: { photographers: Photographer[]; withEquipment?: boolean; fillCells?: boolean }) {
  const [viewP, setViewP] = useState<Photographer | null>(null);
  return (
    <>
      <table className="w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <th className="border border-slate-200 px-1.5 py-1">Photographer</th>
            {FIT_STATIONS.map((st) => (
              <th key={st} className={cn("border border-slate-200 px-1.5 py-1 whitespace-nowrap", fillCells && "w-24")}>
                {fillCells ? normStation(st) : FIT_SHORT[st] || normStation(st)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {photographers.map((p) => {
            const lenses = lensRanges(p.lenses);
            const flash = hasFlash(p);
            // No lens carries a confirmed f/2.8-or-faster aperture — ratings are tentative
            const apUncertain = lenses.length > 0 && !lenses.some((l) => l.apKnown && l.fast);
            return (
              <tr key={p.id}>
                <td className="border border-slate-200 px-1.5 py-1 whitespace-nowrap font-bold text-slate-900">
                  <span className="inline-flex items-center gap-1">
                    {p.acronym || p.name}
                    {withEquipment && (
                      <button
                        type="button"
                        onClick={() => setViewP(p)}
                        title="View equipment"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                      >
                        <Aperture size={13} />
                      </button>
                    )}
                  </span>
                </td>
                {FIT_STATIONS.map((st) => {
                  const fit: Fit = lenses.length === 0 ? "na" : stationFit(st, lenses, flash);
                  const fitLensUsed = fit !== "red" && fit !== "na" ? fitLens(st, lenses) : null;
                  const tip = `${p.acronym || p.name} · ${st} (${fitHint(st)}): ${fitLensUsed ? lensLabel(fitLensUsed) : fit === "red" || fit === "na" ? "no lens" : lenses.length ? p.lenses : "no lens data"}${/finish|hero\s*wall/i.test(st) ? ` · flash: ${flash ? "yes" : "no"}` : ""}${apUncertain ? " — aperture unknown, f/2.8 not confirmed" : ""}`;
                  return (
                    <td
                      key={st}
                      className={cn("border border-slate-200 px-1.5 py-1 text-center", fillCells && `h-7 w-24 ${FIT_CELL[fit]}`)}
                      title={tip}
                    >
                      {fillCells ? (
                        apUncertain && fit !== "na" && fit !== "red" && (
                          <span className="text-[10px] font-black leading-none text-white/90" title="Aperture unknown — f/2.8 not confirmed">!</span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-0.5">
                          <span
                            className={cn("inline-block h-3 w-3 rounded-sm", FIT_CELL[fit])}
                            title={tip}
                          />
                          {apUncertain && fit !== "na" && fit !== "red" && (
                            <span className="text-[10px] font-black leading-none text-amber-500" title="Aperture unknown — f/2.8 not confirmed">!</span>
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {viewP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewP(null)}>
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{viewP.name || viewP.acronym}</p>
                <p className="text-xs text-slate-500">{[viewP.acronym, viewP.role].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={() => setViewP(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <dl className="space-y-2.5 text-xs">
              {[
                ["Cameras", viewP.cameras],
                ["Lenses", viewP.lenses],
                ["Flashes", viewP.flashes],
                ["Remote camera", viewP.remoteCamera],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {equipList(val as string).length ? (
                      equipList(val as string).map((item, i) => (
                        <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{item}</span>
                      ))
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}

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
  tap,
}: {
  values: string[];
  onDropName: (name: string) => void;
  onRemove: (name: string) => void;
  chipClass: (v: string) => string;
  droppable?: boolean;
  /** Called when a chip inside this cell starts being dragged (move, not copy) */
  onDragChip?: (name: string) => void;
  /** Tap-to-assign plumbing — pick chips up / drop into this cell (touch UIs) */
  tap?: {
    src: { si: number; sti: number; key: "photographers" | "cover" | "ls" };
    picked: { name: string; src: { si: number; sti: number; key: "photographers" | "cover" | "ls" } | null } | null;
    pick: (name: string, src: { si: number; sti: number; key: "photographers" | "cover" | "ls" } | null) => void;
    drop: () => void;
  };
}) {
  const [over, setOver] = useState(false);
  const isPickedChip = (v: string) =>
    !!tap?.picked && tap.picked.name === v &&
    tap.picked.src?.si === tap.src.si && tap.picked.src?.sti === tap.src.sti && tap.picked.src?.key === tap.src.key;
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
      onClick={droppable && tap?.picked ? tap.drop : undefined}
      className={cn(
        "flex h-full min-h-7 w-full flex-wrap items-center gap-1 rounded px-1 py-0.5",
        over && "bg-blue-50 ring-1 ring-blue-300",
        droppable && tap?.picked && "ring-1 ring-blue-200 cursor-pointer"
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
          onClick={tap ? (e) => { e.stopPropagation(); tap.pick(v, tap.src); } : undefined}
          className={cn("group inline-flex h-5 items-center gap-0.5 rounded px-1.5 text-[11px] font-bold text-white", chipClass(v), (onDragChip || tap) && "cursor-grab active:cursor-grabbing", isPickedChip(v) && "ring-2 ring-white/80")}
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
      {values.length === 0 && droppable && (
        <span className="text-[11px] text-slate-300">{tap?.picked ? "tap to assign" : "drop here"}</span>
      )}
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
/** A break row that carries real content — skip fully-empty placeholder rows */
const nonEmptyBreak = (b: HyroxBreakRow) => !!(b.cover || b.start || b.end);

/** Burpees is only shown when it carries real content (crew or note) */
const showStation = (st: HyroxStationPlan) =>
  !/burpee/i.test(st.station) ||
  st.photographers.length > 0 || (st.ls || []).length > 0 || st.cover.length > 0 || !!st.note?.trim();

export function HyroxPublicView({ hyrox, team, callTime, dayNote }: { hyrox: HyroxTactic; team?: string[]; callTime?: string; dayNote?: string }) {
  const shifts = (hyrox.shifts || []).map((sh) => {
    const seen = new Set<string>();
    return sh
      .map((st) => ({ ...st, station: normStation(st.station) }))
      .filter((st) => !seen.has(st.station) && seen.add(st.station));
  });
  const groups = hyrox.switchGroups || [];
  const breaks = normBreakTables(hyrox.breaks);
  // Per-shift station filter — key = shift index, value = station name ("ALL" = no filter)
  const [stationFilter, setStationFilter] = useState<Record<number, string>>({});
  // Station notes are hidden behind a per-row "Note" toggle
  const [noteOpen, setNoteOpen] = useState<Set<string>>(new Set());
  const toggleNote = (k: string) =>
    setNoteOpen((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  // Break tables are indexed by shift — only show those whose shift still exists
  const breakHas = (si: number) =>
    si < shifts.length && BREAK_STATIONS.some((s) => (breaks[si]?.rows?.[s] || []).some(nonEmptyBreak));
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
      {/* Mobile: shifts scroll side-by-side; desktop (sm+) stacks as before */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:block sm:snap-none sm:space-y-4 sm:overflow-visible sm:px-0 sm:pb-0">
      {shifts.map((allStations, si) => {
        const stations = allStations.filter(showStation);
        const active = stationFilter[si] || "ALL";
        const visible = active === "ALL" ? stations : stations.filter((s) => s.station === active);
        return (
        <div key={si} className={cn(shifts.length > 1 && "w-[86vw] shrink-0 snap-start", "sm:w-auto")}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            {shifts.length > 1 && (
              <p className="text-sm font-black uppercase tracking-wider text-slate-900">
                Shift {si + 1}
              </p>
            )}
          </div>
          {/* Station filter — compact dropdown per shift */}
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Station
            </span>
            <select
              value={active}
              onChange={(e) =>
                setStationFilter((f) => ({ ...f, [si]: e.target.value }))
              }
              className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 sm:h-7 sm:max-w-56"
            >
              <option value="ALL">All stations</option>
              {stations.map((s) => (
                <option key={s.station} value={s.station}>
                  {stationLabel(s.station)}
                </option>
              ))}
            </select>
          </div>
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
                {visible.map((st) => (
                  <tr
                    key={st.station}
                    className={cn("align-top text-slate-900", STATION_PASTEL[st.station] || "bg-slate-50")}
                  >
                    <td className="border border-slate-900 px-3 py-2 font-bold whitespace-nowrap">
                      {stationLabel(st.station)}
                      {st.note && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleNote(`${si}:${st.station}`)}
                            className="mt-0.5 block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-200"
                          >
                            {noteOpen.has(`${si}:${st.station}`) ? "Hide note" : "Note"}
                          </button>
                          {noteOpen.has(`${si}:${st.station}`) && (
                            <div className="mt-0.5 whitespace-normal text-[10px] font-normal text-slate-600"><Markdown text={st.note} /></div>
                          )}
                        </>
                      )}
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
          {/* Mobile: labeled-row station cards */}
          <div className="space-y-2 sm:hidden">
            {visible.map((st) => {
              const hasPeople = st.photographers.length > 0 || (st.ls || []).length > 0;
              const breakList = (st.breaks || []) as HyroxBreakRange[];
              return (
                <div
                  key={st.station}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Station header */}
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                    <span className="rounded bg-[#FFED00] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-900">
                      {stationLabel(st.station)}
                    </span>
                    {st.note && (
                      <button
                        type="button"
                        onClick={() => toggleNote(`m${si}:${st.station}`)}
                        className="ml-auto rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
                      >
                        {noteOpen.has(`m${si}:${st.station}`) ? "Hide note" : "Note"}
                      </button>
                    )}
                  </div>
                  {st.note && noteOpen.has(`m${si}:${st.station}`) && (
                    <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] text-slate-600">
                      <Markdown text={st.note} />
                    </div>
                  )}
                  <div className="divide-y divide-slate-100">
                    {/* Photo team row */}
                    <div className="flex items-start gap-2.5 px-3 py-2">
                      <span className="w-11 shrink-0 pt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Photo
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                        {hasPeople ? (
                          <>
                            {st.photographers.map((p, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold",
                                  isExternal(st.station) ? "bg-amber-400 text-slate-900" : chip(p, "bg-green-600")
                                )}
                              >
                                {isExternal(st.station) || !teamSet.has(p) ? `${p} LS` : p}
                              </span>
                            ))}
                            {(st.ls || []).map((p, i) => (
                              <span
                                key={`ls-${i}`}
                                className="inline-flex h-5 items-center rounded bg-amber-400 px-1.5 text-[11px] font-bold text-slate-900"
                              >
                                {p} LS
                              </span>
                            ))}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </div>
                    </div>
                    {/* Cover row — full width, chips wrap cleanly */}
                    {st.cover.length > 0 && (
                      <div className="flex items-start gap-2.5 px-3 py-2">
                        <span className="w-11 shrink-0 pt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Cover
                        </span>
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                          {st.cover.map((c, i) => (
                            <span
                              key={i}
                              className={cn(
                                "inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold",
                                chip(c, "bg-blue-600")
                              )}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Break row — one line per break, aligned times */}
                    {breakList.length > 0 && (
                      <div className="flex items-start gap-2.5 px-3 py-2">
                        <span className="w-11 shrink-0 pt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Break
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          {breakList.map((b, bi) => (
                            <div
                              key={bi}
                              className="flex items-baseline gap-1.5 text-[11px] font-bold text-slate-700"
                            >
                              <span className="w-3 text-center text-[9px] font-semibold text-slate-400">
                                {bi + 1}
                              </span>
                              <span className="w-16 tabular-nums">{fmtT(b.start)}</span>
                              <span className="w-3 text-center text-slate-300">→</span>
                              <span className="tabular-nums">{fmtT(b.end)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
      </div>

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

      {breaks.some((_, si) => breakHas(si)) && (
        <div className="space-y-4">
          {breaks.map((t, si) =>
            breakHas(si) ? (
              <div key={si}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Break schedule — stations 1–3{shifts.length > 1 ? ` (Shift ${si + 1})` : ""}
                </p>
                <div className="hidden overflow-x-auto rounded-md border border-slate-900 sm:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#FFED00] text-[10px] uppercase tracking-wider text-slate-900">
                        <th className="border border-slate-900 px-3 py-2">Station</th>
                        <th className="border border-slate-900 px-3 py-2">Break</th>
                        <th className="border border-slate-900 px-3 py-2">Covered by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BREAK_STATIONS.flatMap((station) => {
                        const list = (t.rows?.[station] || []).filter(nonEmptyBreak);
                        return list.map((b, bi) => (
                          <tr key={`${station}-${bi}`} className="text-slate-900">
                            {bi === 0 && (
                              <td
                                rowSpan={list.length}
                                className={cn(
                                  "border border-slate-900 px-3 py-2 font-bold whitespace-nowrap",
                                  STATION_PASTEL[station] || "bg-slate-50"
                                )}
                              >
                                {station}
                              </td>
                            )}
                            <td className="border border-slate-900 px-3 py-2 font-bold whitespace-nowrap">
                              {fmtT(b.start)}–{fmtT(b.end)}
                            </td>
                            <td className="border border-slate-900 px-3 py-2 font-bold">
                              {b.cover || "—"}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile: stacked station cards, one line per break */}
                <div className="space-y-1.5 sm:hidden">
                  {BREAK_STATIONS.map((station) => {
                    const list = (t.rows?.[station] || []).filter(nonEmptyBreak);
                    if (!list.length) return null;
                    return (
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
                          {list.map((b, bi) => (
                            <div key={bi} className="flex items-baseline gap-2">
                              <span className="shrink-0 whitespace-nowrap opacity-80">
                                {fmtT(b.start)}–{fmtT(b.end)}
                              </span>
                              <span>{b.cover || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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

/** Normalize stored breaks to per-station rows. Handles two legacy shapes:
 *  flat HyroxBreak[] (station/photographer/start/end) and the shared-times
 *  matrix {times, rows: Record<station, string[]>} — a station owned a break
 *  window only when its cover cell was filled. */
const normBreakTables = (b: unknown): HyroxBreakTable[] => {
  if (!Array.isArray(b) || !b.length) return [];
  // legacy flat HyroxBreak[]
  if (typeof b[0] === "object" && b[0] && "station" in b[0]) {
    const legacy = b as { station: string; photographer: string; start: string; end: string }[];
    const rows: Record<string, HyroxBreakRow[]> = {};
    for (const l of legacy) {
      (rows[l.station] ||= []).push({ start: l.start || "", end: l.end || "", cover: l.photographer || "" });
    }
    return [{ rows }];
  }
  return (b as { times?: HyroxBreakRange[]; rows?: Record<string, unknown> }[]).map((t) => {
    if (!t || typeof t !== "object") return { rows: {} };
    // already per-station shape
    if (!Array.isArray(t.times)) return { rows: (t.rows || {}) as Record<string, HyroxBreakRow[]> };
    // shared-times matrix → keep windows the station actually covered
    const rows: Record<string, HyroxBreakRow[]> = {};
    for (const [station, covers] of Object.entries(t.rows || {})) {
      const list = t.times
        .map((tm, i) => ({ start: tm.start || "", end: tm.end || "", cover: String((covers as string[])[i] || "") }))
        .filter((r) => r.cover);
      if (list.length) rows[station] = list;
    }
    return { rows };
  });
};

const normTactic = (t: HyroxTactic): HyroxTactic => {
  const shifts = (t.shifts || []).map((sh) => {
    const seen = new Set<string>();
    const rows = sh
      .map((st) => ({
        ...st,
        station: normStation(st.station),
        ls: Array.isArray(st.ls) ? st.ls : [],
        breaks: normBreaks(st.breaks as unknown as string | BreakRange[]),
      }))
      .filter((st) => !seen.has(st.station) && seen.add(st.station));
    // append any fixed stations added after this tactic was saved (e.g. "LS Arch")
    for (const s of HYROX_STATIONS) {
      if (!rows.some((r) => r.station === s)) rows.push(blankStation(s));
    }
    return rows;
  });
  // break tables are indexed by shift — drop orphans left behind when a shift
  // was removed (their data is unreachable in the editor)
  return { ...t, shifts, breaks: normBreakTables(t.breaks).slice(0, shifts.length) };
};

const dateRange = (start: string, end: string) => dateRangeYmd(start, end, 60);

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
      published: !!event.hyrox?.find((x) => x.date === date)?.published,
      tactic: normTactic(event.hyrox?.find((x) => x.date === date)?.tactic || defaultTactic()),
    }));
  });
  const [activeDate, setActiveDate] = useState(days[0]?.date || "");
  /** Shift index whose break schedule is open in the fullscreen editor, or null */
  const [breakEdit, setBreakEdit] = useState<number | null>(null);
  /** Station currently selected inside the break editor */
  const [breakStation, setBreakStation] = useState<string>(BREAK_STATIONS[0]);
  /** Fast-generate panel state inside the break editor */
  const [fastGen, setFastGen] = useState(false);
  const [fgStart, setFgStart] = useState("09:00");
  const [fgDur, setFgDur] = useState("30");
  const [fgCount, setFgCount] = useState("3");

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

  // Photographers only see a day's tactic once it's published
  const published = !!day?.published;
  const togglePublished = () => {
    const nextDays = days.map((d) => (d.date === activeDate ? { ...d, published: !d.published } : d));
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
  const removeShift = (i: number) =>
    touch({
      ...tactic,
      shifts: tactic.shifts.filter((_, x) => x !== i),
      breaks: tactic.breaks.filter((_, x) => x !== i), // break tables follow their shift
    });

  const addGroup = () =>
    touch({ ...tactic, switchGroups: [...tactic.switchGroups, { id: uid(), name: `Group ${tactic.switchGroups.length + 1}`, photographers: [""] }] });
  const updateGroup = (id: string, p: Partial<HyroxSwitchGroup>) =>
    touch({ ...tactic, switchGroups: tactic.switchGroups.map((g) => (g.id === id ? { ...g, ...p } : g)) });
  const removeGroup = (id: string) =>
    touch({ ...tactic, switchGroups: tactic.switchGroups.filter((g) => g.id !== id) });

  // Break schedules indexed by shift — each of stations 1-3 owns its break rows
  const breakRows = (si: number, station: string): HyroxBreakRow[] =>
    tactic.breaks[si]?.rows?.[station] || [];
  const setBreakRows = (si: number, station: string, list: HyroxBreakRow[]) => {
    const breaks = [...tactic.breaks];
    breaks[si] = { rows: { ...(breaks[si]?.rows || {}), [station]: list } };
    touch({ ...tactic, breaks });
  };
  const addBreakRow = (si: number, station: string) =>
    setBreakRows(si, station, [...breakRows(si, station), { start: "", end: "", cover: "" }]);
  const setBreakRow = (si: number, station: string, bi: number, p: Partial<HyroxBreakRow>) =>
    setBreakRows(si, station, breakRows(si, station).map((r, x) => (x === bi ? { ...r, ...p } : r)));
  const removeBreakRow = (si: number, station: string, bi: number) =>
    setBreakRows(si, station, breakRows(si, station).filter((_, x) => x !== bi));

  /** Fast-generate break windows: `count` breaks per crew member of `dur`
      minutes starting at `fgStart`; "Covered by" is left blank for manual fill. */
  const fastGenerate = (si: number, station: string) => {
    const st = (tactic.shifts[si] || []).find((x) => normStation(x.station) === station || x.station === station);
    const crew = st?.photographers || [];
    const mins = parseInt(fgDur, 10);
    const per = parseInt(fgCount, 10);
    if (!fgStart || !mins || !per || crew.length === 0) return;
    const [h, m] = fgStart.split(":").map(Number);
    const t0 = h * 60 + m;
    const hm = (t: number) => `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    const rows: HyroxBreakRow[] = [];
    for (let i = 0; i < crew.length * per; i++) {
      rows.push({ start: hm(t0 + i * mins), end: hm(t0 + (i + 1) * mins), cover: "" });
    }
    setBreakRows(si, station, rows);
    setFastGen(false);
  };

  const removeName = (si: number, sti: number, key: "photographers" | "cover" | "ls", name: string) =>
    setShiftStation(si, sti, { [key]: tactic.shifts[si][sti][key].filter((n) => n !== name) });

  /** Source cell of a chip currently being dragged — null when dragging from the Team pool */
  const dragSrcRef = useRef<{ si: number; sti: number; key: "photographers" | "cover" | "ls" } | null>(null);

  // Tap-to-assign (touch devices can't drag): tap a chip to pick it up,
  // tap a cell to drop it. Reuses dragSrcRef + dropName for move/dedupe.
  type CellSrc = { si: number; sti: number; key: "photographers" | "cover" | "ls" };
  const [picked, setPicked] = useState<{ name: string; src: CellSrc | null } | null>(null);
  const [fitOpen, setFitOpen] = useState(true);
  const sameSrc = (a: CellSrc | null, b: CellSrc | null) =>
    a?.si === b?.si && a?.sti === b?.sti && a?.key === b?.key;
  const tapPick = (name: string, src: CellSrc | null) =>
    setPicked((p) => (p && p.name === name && sameSrc(p.src, src) ? null : { name, src }));
  const tapDrop = (si: number, sti: number, key: CellSrc["key"]) => {
    if (!picked) return;
    dragSrcRef.current = picked.src;
    dropName(si, sti, key, picked.name);
    setPicked(null);
  };

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
        if (isExternal(st.station)) continue; // LS-crew stations never alert
        for (const n of st.photographers) {
          // Only actual station assignments alert — LS entries and jumper cover don't
          if (!n || !teamTags.has(n)) continue;
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
          <button
            type="button"
            onClick={togglePublished}
            title={published ? "Visible on the photographer link — click to hide" : "Hidden from photographers — click to publish"}
            className={`relative ml-auto flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${published ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            <span
              className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${published ? "translate-x-[22px]" : "translate-x-0.5"}`}
            >
              {published ? <Eye size={11} className="text-emerald-600" /> : <EyeOff size={11} className="text-slate-400" />}
            </span>
          </button>
          <span className={`text-xs font-semibold ${published ? "text-emerald-600" : "text-slate-400"}`}>
            {published ? "Published" : "Hidden"}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
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
      {/* Station fit — is each photographer's kit right for each station? */}
      <Card>
        <CardHeader
          title="Station fit"
          icon={<AlertTriangle size={15} className="text-blue-600" />}
          action={
            <div className="flex items-center gap-1">
              <a
                href={`/events/${event.id}/station-fit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                <ExternalLink size={13} /> View in new tab
              </a>
              <button
                type="button"
                onClick={() => setFitOpen((v) => !v)}
                title={fitOpen ? "Collapse" : "Expand"}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                {fitOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
          }
        />
        {fitOpen && (
          <>
            <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] text-slate-400">
              Green = covers the station at f/2.8 · yellow = partial fit · red = not covered or slower than f/2.8 · grey = no requirement or no lens data · ! = aperture unknown (f/2.8 unconfirmed)
            </p>
            <div className="overflow-x-auto">
              <StationFitTable photographers={event.photographers} />
            </div>
          </>
        )}
      </Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
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
                          tap={{ src: { si, sti, key: "photographers" }, picked, pick: tapPick, drop: () => tapDrop(si, sti, "photographers") }}
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
                          tap={{ src: { si, sti, key: "photographers" }, picked, pick: tapPick, drop: () => tapDrop(si, sti, "photographers") }}
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
                              tap={{ src: { si, sti, key: "ls" }, picked, pick: tapPick, drop: () => tapDrop(si, sti, "ls") }}
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
                          tap={{ src: { si, sti, key: "photographers" }, picked, pick: tapPick, drop: () => tapDrop(si, sti, "photographers") }}
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
                          tap={{ src: { si, sti, key: "cover" }, picked, pick: tapPick, drop: () => tapDrop(si, sti, "cover") }}
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
          <Button variant="outline" size="sm" onClick={() => setBreakEdit(0)}>
            Edit breaks
          </Button>
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

      {/* Fullscreen break-schedule editor — station picker + line-per-break list */}
      {breakEdit !== null && (() => {
        const si = breakEdit;
        const station = BREAK_STATIONS.includes(breakStation) ? breakStation : BREAK_STATIONS[0];
        const list = breakRows(si, station);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-bold text-slate-700">
                  Break schedule — Stations 1–3{tactic.shifts.length > 1 ? ` (Shift ${si + 1})` : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setBreakEdit(null)}>
                  <X size={15} />
                </Button>
              </div>
              <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
                {/* Shift + station pickers, then line-per-break rows */}
                <div className="flex items-center gap-2">
                  {tactic.shifts.length > 1 && (
                    <Select
                      value={si}
                      onChange={(e) => setBreakEdit(Number(e.target.value))}
                      className="w-28"
                    >
                      {tactic.shifts.map((_, i) => (
                        <option key={i} value={i}>Shift {i + 1}</option>
                      ))}
                    </Select>
                  )}
                  <Select value={station} onChange={(e) => setBreakStation(e.target.value)} className="w-48">
                    {BREAK_STATIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setFastGen((v) => !v)}>
                    <AlarmClock size={12} className="mr-1" /> Fast generate
                  </Button>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => addBreakRow(si, station)}>
                    <Plus size={12} className="mr-1" /> break
                  </Button>
                </div>
                {fastGen && (() => {
                  const st = (tactic.shifts[si] || []).find((x) => normStation(x.station) === station || x.station === station);
                  const crewN = (st?.photographers || []).length;
                  const total = crewN * (parseInt(fgCount, 10) || 0);
                  return (
                    <div className="flex flex-wrap items-end gap-2 rounded-md border border-blue-200 bg-blue-50/60 p-2.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Start
                        <Input type="time" value={fgStart} onChange={(e) => setFgStart(e.target.value)} className="mt-0.5 w-24" />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Duration (min)
                        <Input type="number" min={1} value={fgDur} onChange={(e) => setFgDur(e.target.value)} className="mt-0.5 w-20" />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Breaks / person
                        <Input type="number" min={1} value={fgCount} onChange={(e) => setFgCount(e.target.value)} className="mt-0.5 w-20" />
                      </label>
                      <span className="pb-2 text-[11px] text-slate-500">
                        {crewN} on {station} → <b>{total}</b> windows
                      </span>
                      <Button
                        size="sm"
                        className="ml-auto"
                        disabled={!fgStart || !crewN || !(parseInt(fgDur, 10) > 0) || !(parseInt(fgCount, 10) > 0)}
                        onClick={() => fastGenerate(si, station)}
                      >
                        Generate
                      </Button>
                    </div>
                  );
                })()}
                <div className="min-h-0 flex-1 overflow-auto">
                {list.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                          <th className="w-10 px-3 py-2">#</th>
                          <th className="px-3 py-2">Break window</th>
                          <th className="px-3 py-2">Covered by</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {list.map((b, bi) => (
                          <tr key={bi}>
                            <td className="px-3 py-1.5 text-xs text-slate-400">{bi + 1}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="time"
                                  value={b.start}
                                  className="w-24"
                                  onChange={(e) => setBreakRow(si, station, bi, { start: e.target.value })}
                                />
                                <span className="text-xs text-slate-400">–</span>
                                <Input
                                  type="time"
                                  value={b.end}
                                  className="w-24"
                                  onChange={(e) => setBreakRow(si, station, bi, { end: e.target.value })}
                                />
                              </div>
                            </td>
                            <td
                              className="px-3 py-1.5"
                              onClick={() => {
                                if (picked?.name) {
                                  setBreakRow(si, station, bi, { cover: picked.name });
                                  setPicked(null);
                                }
                              }}
                            >
                              <Input
                                value={b.cover}
                                placeholder="Name or tap a member here"
                                className={cn("max-w-56", picked?.name && "ring-1 ring-blue-300")}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const n = e.dataTransfer.getData("text/plain");
                                  if (n) setBreakRow(si, station, bi, { cover: n });
                                }}
                                onChange={(e) => setBreakRow(si, station, bi, { cover: e.target.value })}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <button
                                title="Remove break"
                                onClick={() => removeBreakRow(si, station, bi)}
                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No breaks for {station} yet — click &quot;+ break&quot; to add one.
                  </p>
                )}
                </div>
                {/* Break pool — members of stations 1–3 in the shift being edited
                    who are not covering anyone (they cover each other) */}
                {(() => {
                  const stationSet = new Set(BREAK_STATIONS);
                  const stationMembers = new Set(
                    (tactic.shifts[si] || []).filter((s) => stationSet.has(s.station)).flatMap((s) => s.photographers)
                  );
                  const pool = event.photographers.filter((p) => {
                    const tag = p.acronym || p.name;
                    return stationMembers.has(tag) && !coveringSet.has(tag);
                  });
                  return pool.length > 0 ? (
                    <aside className="shrink-0 rounded-md border border-slate-200 p-1.5">
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Stations 1–3{tactic.shifts.length > 1 ? ` — Shift ${si + 1}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {pool.map((p) => {
                          const tag = p.acronym || p.name;
                          return (
                            <span
                              key={p.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("text/plain", tag)}
                              onClick={() => tapPick(tag, null)}
                              className={cn(
                                "cursor-grab truncate rounded bg-green-600 px-1.5 py-0.5 text-left text-[10px] font-bold text-white active:cursor-grabbing",
                                picked?.name === tag && !picked.src && "ring-2 ring-blue-300"
                              )}
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
        <aside className="w-full shrink-0 space-y-2 md:sticky md:top-20 md:w-60 md:self-start">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Team{picked?.name ? ` — ${picked.name} picked` : ""}
          </p>
          <div className="grid grid-cols-3 gap-1 overflow-y-auto md:grid-cols-2" style={{ maxHeight: "calc(100vh - 140px)" }}>
            {event.photographers.map((p) => {
              const tag = p.acronym || p.name;
              const covering = coveringSet.has(tag);
              const assigned = assignedSet.has(tag);
              return (
                <span
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", tag)}
                  onClick={() => tapPick(tag, null)}
                  title={covering ? "Covering (jumper)" : assigned ? "Assigned to a station" : "Drag or tap to assign"}
                  className={cn(
                    "cursor-grab truncate rounded px-2 py-1 text-left text-[11px] font-bold text-white active:cursor-grabbing",
                    covering ? "bg-blue-600" : assigned ? "bg-green-600" : "bg-slate-400",
                    picked?.name === tag && !picked.src && "ring-2 ring-blue-300"
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
