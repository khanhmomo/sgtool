"use client";

import { useEffect, useRef, useState } from "react";
import { AlarmClock, AlertTriangle, Aperture, BookOpen, ChevronDown, ChevronUp, Copy, Download, ExternalLink, Eye, EyeOff, Plus, SeparatorHorizontal, Trash2, Users, X } from "lucide-react";
import { Button, Card, CardHeader, Input, Select, Textarea } from "@/components/ui";
import { cn, fmtDate, uid, dateRangeYmd } from "@/lib/utils";
import { BREAK_TPL_CATEGORY, breakTemplateSummary, normBreakTables, parseBreakTemplate } from "@/lib/hyrox-breaks";
import Markdown from "@/components/Markdown";
import type { HyroxBreakRange, HyroxBreakRow, HyroxDayPlan, HyroxStationPlan, HyroxSwitchGroup, HyroxTactic, Photographer, TemplateDTO } from "@/types";
import type { TabProps } from "./EventWorkspace";
import { canon } from "./useLiveState";

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

/** Station reference image — local photos in /public (station1-8, finish, herowall) */
const stationImg = (name: string) => {
  const n = normStation(name);
  const i = HYROX_STATIONS.indexOf(n);
  if (i >= 0 && i < 8) return `/station${i + 1}.jpeg`;
  if (/finish/i.test(n)) return "/finish.jpeg";
  if (/hero\s*wall/i.test(n)) return "/herowall.jpeg";
  if (/ls\s*arch/i.test(n)) return "/arch.jpeg";
  return `https://picsum.photos/seed/${encodeURIComponent(n)}/192/128`;
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

/** Break-schedule matrix stations — the first 3 race stations (SkiErg, Sled Push,
    Sled Pull). They self-manage breaks (no jumper cover), so their breaks live in
    the break-schedule matrix below the tactic, not in the per-station cells.
    Other stations' breaks are edited in-tactic (st.breaks) and covered by jumpers. */
const BREAK_STATIONS = HYROX_STATIONS.slice(0, 3);
const isMatrixStation = (s: string) => BREAK_STATIONS.includes(normStation(s));

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
    /** This cell is the selected target — pool taps land here */
    selected?: boolean;
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
      onClick={droppable && tap ? tap.drop : undefined}
      className={cn(
        "flex h-full min-h-7 w-full flex-wrap items-center gap-1 rounded px-1 py-0.5",
        over && "bg-blue-50 ring-1 ring-blue-300",
        droppable && tap?.picked && "ring-1 ring-blue-200 cursor-pointer",
        droppable && tap?.selected && "ring-2 ring-blue-500 cursor-pointer bg-blue-50/60"
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
            onClick={(e) => { e.stopPropagation(); onRemove(v); }}
            className="inline px-0.5 text-white/70 hover:text-white sm:hidden sm:group-hover:inline"
            title="Remove"
          >
            ×
          </button>
        </span>
      ))}
      {values.length === 0 && droppable && (
        <span className="text-[11px] text-slate-300">
          {tap?.selected ? "selected — tap names in Team" : tap?.picked ? "tap to assign" : "drop here"}
        </span>
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
  // Mobile shift scroller — which shift card is currently snapped into view
  const shiftScrollRef = useRef<HTMLDivElement>(null);
  const [activeShift, setActiveShift] = useState(0);
  // Print (Save PDF): reset station filters so the printout contains the
  // complete tactic, not just the visible slice. (Notes are always shown.)
  useEffect(() => {
    const open = () => setStationFilter({});
    window.addEventListener("beforeprint", open);
    return () => window.removeEventListener("beforeprint", open);
  });
  const onShiftScroll = () => {
    const el = shiftScrollRef.current;
    if (!el || !el.firstElementChild) return;
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 12; // card + gap
    if (w > 12) setActiveShift(Math.round(el.scrollLeft / w));
  };
  // Break tables are indexed by shift — only show those whose shift still exists
  const breakHas = (si: number) =>
    si < shifts.length && Object.values(breaks[si]?.rows || {}).some((list) => list.some(nonEmptyBreak));
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
      {shifts.length > 1 && (
        <p className="mb-2 rounded-md bg-[#FFED00] px-3 py-2 text-center text-sm font-black uppercase tracking-wider text-slate-900 sm:hidden print:hidden">
          {activeShift === 0
            ? `⇠ Swipe to view Shift ${shifts.length > 2 ? "2" : shifts.length} ⇢`
            : activeShift === shifts.length - 1
              ? `⇠ Swipe to view Shift ${activeShift} ⇢`
              : "⇠ Swipe to view another shift ⇢"}
        </p>
      )}
      <div
        ref={shiftScrollRef}
        onScroll={onShiftScroll}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:block sm:snap-none sm:space-y-4 sm:overflow-visible sm:px-0 sm:pb-0 print:block print:snap-none print:space-y-4 print:overflow-visible print:px-0 print:pb-0"
      >
      {shifts.map((allStations, si) => {
        const stations = allStations.filter(showStation);
        const active = stationFilter[si] || "ALL";
        const visible = active === "ALL" ? stations : stations.filter((s) => s.station === active);
        return (
        <div key={si} className={cn(shifts.length > 1 && "w-[86vw] shrink-0 snap-start", "sm:w-auto print:w-full print:snap-align-none")}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            {shifts.length > 1 && (
              <p className="text-sm font-black uppercase tracking-wider text-slate-900">
                Shift {si + 1}
              </p>
            )}
          </div>
          {/* Station filter — compact dropdown per shift */}
          <div className="mb-2 flex items-center gap-1.5 print:hidden">
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
                      <span className="inline-flex items-center gap-1.5">
                        <img src={stationImg(st.station)} alt="" className="h-14 w-24 rounded-md object-cover" />
                        {stationLabel(st.station)}
                      </span>
                      {st.note && (
                        <div className="mt-0.5 whitespace-normal text-[10px] font-normal text-slate-600"><Markdown text={st.note} /></div>
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
                    <img src={stationImg(st.station)} alt="" className="h-12 w-20 rounded-md object-cover" />
                    <span className="rounded bg-[#FFED00] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-900">
                      {stationLabel(st.station)}
                    </span>
                  </div>
                  {st.note && (
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
          <p className="mb-1.5 flex items-baseline justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Switch schedule
            <span className="text-[10px] font-medium normal-case tracking-normal text-slate-400 sm:hidden">swipe to view more →</span>
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-900">
            <table className="w-full border-collapse text-left text-xs">
              <tbody>
                {groups.map((g) =>
                  g.separator ? (
                    <tr key={g.id}>
                      <td
                        colSpan={maxP * 2 - 1}
                        className="bg-slate-900 px-3 py-1.5 text-left text-[10px] font-black uppercase tracking-widest text-[#FFED00]"
                      >
                        {g.name || "—"}
                      </td>
                    </tr>
                  ) : (
                  <tr key={g.id} className="bg-white text-slate-900">
                    {Array.from({ length: maxP }).flatMap((_, i) => [
                      <td key={`p${i}`} className="px-3 py-2 font-bold whitespace-nowrap">
                        {g.photographers[i] ? (
                          <>
                            {g.photographers[i]}
                            {g.stations?.[i] && (
                              <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{g.stations[i]}</span>
                            )}
                          </>
                        ) : null}
                      </td>,
                      // narrow arrow column between photos — shows the rotation direction
                      // arrow only when the next slot actually has someone — cell stays
                      // (empty) otherwise so columns keep aligning across rows
                      ...(i < maxP - 1
                        ? [<td key={`a${i}`} className="px-1 py-2 text-center font-bold text-slate-400">{g.photographers[i + 1] ? "→" : ""}</td>]
                        : []),
                    ])}
                  </tr>
                  )
                )}
              </tbody>
            </table>
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
                <p className="mb-1.5 flex items-baseline justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Break schedule{shifts.length > 1 ? ` (Shift ${si + 1})` : ""}
                  <span className="text-[10px] font-medium normal-case tracking-normal text-slate-400 sm:hidden">swipe to view more →</span>
                </p>
                {(() => {
                  // Matrix layout like the PDF: one column per break window,
                  // one row per station, cell = who covers that window.
                  const windows: string[] = [];
                  const table = BREAK_STATIONS.map((station) => {
                    const m: Record<string, string> = {};
                    (t.rows?.[station] || []).forEach((b) => {
                      if (b.start && b.end) {
                        const k = `${b.start}–${b.end}`;
                        if (!windows.includes(k)) windows.push(k);
                        m[k] = b.cover || "";
                      } else if (b.cover) {
                        m.__self = b.cover;
                      }
                    });
                    return { station, m };
                  }).filter(({ m }) => Object.keys(m).length > 0);
                  if (!table.length) return null;
                  windows.sort(); // HH:MM zero-padded → lexicographic = chronological
                  const hasSelf = table.some(({ m }) => m.__self);
                  return (
                    <div className="overflow-x-auto rounded-md border border-slate-900">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-[#FFED00] text-[10px] uppercase tracking-wider text-slate-900">
                            <th className="border border-slate-900 px-3 py-2">Station</th>
                            {windows.map((w) => (
                              <th key={w} className="border border-slate-900 px-3 py-2 whitespace-nowrap">
                                {fmtT(w.split("–")[0])}–{fmtT(w.split("–")[1])}
                              </th>
                            ))}
                            {hasSelf && (
                              <th className="border border-slate-900 px-3 py-2">Self manage</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {table.map(({ station, m }) => (
                            <tr key={station} className="text-slate-900">
                              <td
                                className={cn(
                                  "border border-slate-900 px-3 py-2 font-bold whitespace-nowrap",
                                  STATION_PASTEL[station] || "bg-slate-50"
                                )}
                              >
                                {station}
                              </td>
                              {windows.map((w) => (
                                <td key={w} className="border border-slate-900 px-3 py-2 font-bold">
                                  {m[w] || "—"}
                                </td>
                              ))}
                              {hasSelf && (
                                <td className="border border-slate-900 px-3 py-2 font-bold">
                                  {m.__self || "—"}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
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

// Days cover the event's start→end range PLUS any saved hyrox dates — saved
// days outside the range are kept (marked "outside event") so data is never
// silently hidden when the event dates change after a tactic was saved.
const buildHyroxDays = (event: TabProps["event"]): HyroxDayPlan[] => {
  const range = dateRange(event.date.slice(0, 10), (event.endDate || "").slice(0, 10));
  const saved = (event.hyrox || []).map((d) => d.date).filter(Boolean);
  const dates = [...range, ...saved];
  return [...new Set(dates)].sort().map((date) => {
    const sd = event.hyrox?.find((x) => x.date === date);
    return {
      ...sd, // keep note and any other persisted fields
      date,
      callTime: sd?.callTime || "",
      published: !!sd?.published,
      tactic: normTactic(sd?.tactic || defaultTactic()),
    };
  });
};

export default function HyroxTactic({ event, patch, saving }: TabProps) {
  const [days, setDays] = useState<HyroxDayPlan[]>(() => buildHyroxDays(event));
  // Live collaboration — when the workspace poll refreshes event.hyrox, merge it
  // per-day instead of replacing wholesale: adopt server state only for days with
  // no unsaved local edits, so nobody's typing is ever reverted. Conflicts keep
  // the local copy — its autosave wins server-side anyway (last write wins).
  const syncBaseRef = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    const incoming = buildHyroxDays(event);
    const fps = new Map(incoming.map((d) => [d.date, canon(d)]));
    const base = syncBaseRef.current;
    if (!base) {
      // First run — local state was initialized from the same event, nothing to merge
      syncBaseRef.current = fps;
      return;
    }
    syncBaseRef.current = fps;
    setDays((local) => {
      let changed = false;
      const merged = incoming.map((inc) => {
        const l = local.find((d) => d.date === inc.date);
        if (!l) {
          changed = true;
          return inc; // day appeared (date range changed remotely)
        }
        const incFp = canon(inc);
        const localFp = canon(l);
        if (incFp === localFp) return l; // identical — keep object identity, no re-render churn
        if (incFp === base.get(inc.date)) return l; // server unchanged — local edit in flight
        if (localFp !== base.get(inc.date)) return l; // conflict — local dirty, keep local
        changed = true;
        return inc; // remote change on a clean day — adopt it
      });
      return changed ? merged : local;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.hyrox, event.date, event.endDate]);
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
  /** "From Bookshelf" break-template picker inside the break editor */
  const [tplOpen, setTplOpen] = useState(false);
  const [tplList, setTplList] = useState<TemplateDTO[] | null>(null);

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
    // Per-day merge metadata — see TacticTab: stale editors only write the
    // days they actually changed.
    const server = event.hyrox || [];
    patch({
      hyrox: persisted,
      hyroxChanged: persisted
        .filter((d) => !server.some((sd) => sd.date === d.date && JSON.stringify(sd) === JSON.stringify(d)))
        .map((d) => d.date),
      hyroxBaseKeys: server.map((d) => d.date),
    });
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
  /** Insert a named separator row (e.g. "Round 2") above the row with id `beforeId` — or at the end when omitted */
  const addSeparator = (beforeId?: string) => {
    const sep: HyroxSwitchGroup = { id: uid(), name: "", photographers: [], separator: true };
    const list = [...tactic.switchGroups];
    const at = beforeId ? list.findIndex((g) => g.id === beforeId) : list.length;
    list.splice(at < 0 ? list.length : at, 0, sep);
    touch({ ...tactic, switchGroups: list });
  };
  const updateGroup = (id: string, p: Partial<HyroxSwitchGroup>) =>
    touch({ ...tactic, switchGroups: tactic.switchGroups.map((g) => (g.id === id ? { ...g, ...p } : g)) });
  const removeGroup = (id: string) =>
    touch({ ...tactic, switchGroups: tactic.switchGroups.filter((g) => g.id !== id) });

  // Break schedules indexed by shift — each station owns its break rows
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

  const loadTpl = () => {
    if (tplList !== null) return;
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) =>
        setTplList((d.templates || []).filter((t: TemplateDTO) => t.category === BREAK_TPL_CATEGORY))
      )
      .catch(() => setTplList([]));
  };

  // Load break templates the first time the picker opens
  useEffect(() => {
    if (tplOpen) loadTpl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplOpen]);

  /** Apply a Bookshelf break template to this shift — fills every station the
      template defines at once, "Covered by" left blank for manual fill. */
  const applyBreakTemplate = (si: number, body: string) => {
    const data = parseBreakTemplate(body);
    const stations = BREAK_STATIONS.filter((s) => (data[s] || []).length > 0);
    if (!stations.length) return;
    const dirty = stations.some((s) => breakRows(si, s).some(nonEmptyBreak));
    if (dirty && !confirm("Replace existing break rows for these stations?")) return;
    const breaks = [...tactic.breaks];
    const rows = { ...(breaks[si]?.rows || {}) };
    for (const s of stations) {
      rows[s] = data[s].map((w) => ({ start: w.start, end: w.end, cover: "" }));
    }
    breaks[si] = { rows };
    touch({ ...tactic, breaks });
    setTplOpen(false);
  };

  /** Apply a Bookshelf break template to every station in a shift — fills each
      station's "Breaks" windows (st.breaks) from the matching template section. */
  const applyShiftBreakTemplate = (si: number, body: string) => {
    const data = parseBreakTemplate(body);
    const targets = (tactic.shifts[si] || [])
      .map((st, sti) => ({ sti, station: st.station, win: data[normStation(st.station)] || [] }))
      .filter((t) => t.win.length > 0 && !isMatrixStation(t.station));
    if (!targets.length) return;
    const dirty = targets.some(({ sti }) => normBreaks(tactic.shifts[si][sti].breaks).length > 0);
    if (dirty && !confirm("Replace existing break windows for those stations?")) return;
    const shifts = tactic.shifts.map((sh, i) =>
      i !== si
        ? sh
        : sh.map((st) => {
            const win = data[normStation(st.station)];
            return win?.length ? { ...st, breaks: win.map((w) => ({ ...w })) } : st;
          })
    );
    touch({ ...tactic, shifts });
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

  // Target-first assign (phone-friendly): tap a cell's empty space to select it
  // (blue ring), then tap names in the Team pool — each tap drops into the
  // selected cell. Tapping the same cell again deselects.
  const [target, setTarget] = useState<CellSrc | null>(null);
  const cellTap = (si: number, sti: number, key: CellSrc["key"]) => {
    if (picked) { tapDrop(si, sti, key); return; }
    setTarget((t) => (t && sameSrc(t, { si, sti, key }) ? null : { si, sti, key }));
  };
  const isTarget = (si: number, sti: number, key: CellSrc["key"]) =>
    !!target && sameSrc(target, { si, sti, key });
  const poolTap = (tag: string) => {
    if (target) {
      dragSrcRef.current = null; // pool assign, not a move
      dropName(target.si, target.sti, target.key, tag);
    } else {
      tapPick(tag, null);
    }
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
        : shift.some((s) => !isExternal(s.station) && s.photographers.includes(name));
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
  // Green = shooting a station. LS-crew spots (external stations + ls arrays) don't
  // count — those people are still free to be assigned as photographers.
  // Tracked per shift so the pool chip can show a split color: left = shift 1, right = shift 2.
  const shiftAssigned = tactic.shifts.map(
    (shift) => new Set(shift.flatMap((s) => (isExternal(s.station) ? [] : s.photographers)))
  );
  const assignedSet = new Set(shiftAssigned.flatMap((s) => [...s]));
  const coveringSet = new Set(tactic.shifts.flat().flatMap((s) => s.cover));
  /** Team acronym/name tags — anything else in a cell is an external (LS) */
  const teamTags = new Set(event.photographers.map((p) => p.acronym || p.name));

  // Rotation alerts — recomputed on every render, so they appear/disappear live.
  // Rule 1: same photographer on the same station in BOTH shifts of the same day.
  // Rule 2: same photographer on the same station on consecutive days.
  type DupAlert = { name: string; station: string } & (
    | { kind: "shifts"; date: string; shifts: number[] }
    | { kind: "days"; dates: string[] }
  );
  const stationDayShifts = new Map<string, Set<number>>(); // n@@st@@date -> shift idxs
  const stationDates = new Map<string, Set<string>>(); // n@@st -> dates
  for (const d of days) {
    (d.tactic?.shifts || []).forEach((shift, si) => {
      for (const st of shift) {
        if (isExternal(st.station)) continue; // LS-crew stations never alert
        for (const n of st.photographers) {
          // Only actual station assignments alert — LS entries and jumper cover don't
          if (!n || !teamTags.has(n)) continue;
          const k = `${n}@@${st.station}`;
          const s1 = stationDayShifts.get(`${k}@@${d.date}`) || new Set<number>();
          s1.add(si);
          stationDayShifts.set(`${k}@@${d.date}`, s1);
          const s2 = stationDates.get(k) || new Set<string>();
          s2.add(d.date);
          stationDates.set(k, s2);
        }
      }
    });
  }
  const dupAlerts: DupAlert[] = [];
  for (const [key, shifts] of stationDayShifts) {
    if (shifts.size > 1) {
      const [name, station, date] = key.split("@@");
      dupAlerts.push({ name, station, kind: "shifts", date, shifts: [...shifts].sort((a, b) => a - b) });
    }
  }
  const dayMs = 24 * 60 * 60 * 1000;
  for (const [key, dates] of stationDates) {
    const sorted = [...dates].sort();
    // Maximal runs of consecutive dates (length >= 2) each produce one alert
    let run = [sorted[0]];
    for (let i = 1; i <= sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + "T12:00:00").getTime();
      const cur = i < sorted.length ? new Date(sorted[i] + "T12:00:00").getTime() : NaN;
      if (cur - prev === dayMs) {
        run.push(sorted[i]);
        continue;
      }
      if (run.length > 1) {
        const [name, station] = key.split("@@");
        dupAlerts.push({ name, station, kind: "days", dates: [...run] });
      }
      run = i < sorted.length ? [sorted[i]] : [];
    }
  }
  dupAlerts.sort((a, b) => a.name.localeCompare(b.name));

  // Shared cell renderers — used by both the desktop table and the mobile station cards
  const photoCell = (si: number, sti: number, st: HyroxStationPlan) =>
    isExternal(st.station) ? (
      /* External crew — whole cell is an LS drop zone; assigned members allowed */
      <NameCell
        values={st.photographers}
        onDropName={(n) => dropName(si, sti, "photographers", n)}
        onRemove={(n) => removeName(si, sti, "photographers", n)}
        onDragChip={() => { dragSrcRef.current = { si, sti, key: "photographers" }; }}
        tap={{ src: { si, sti, key: "photographers" }, picked, pick: tapPick, drop: () => cellTap(si, sti, "photographers"), selected: isTarget(si, sti, "photographers") }}
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
            tap={{ src: { si, sti, key: "photographers" }, picked, pick: tapPick, drop: () => cellTap(si, sti, "photographers"), selected: isTarget(si, sti, "photographers") }}
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
            tap={{ src: { si, sti, key: "ls" }, picked, pick: tapPick, drop: () => cellTap(si, sti, "ls"), selected: isTarget(si, sti, "ls") }}
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
          tap={{ src: { si, sti, key: "photographers" }, picked, pick: tapPick, drop: () => cellTap(si, sti, "photographers"), selected: isTarget(si, sti, "photographers") }}
          chipClass={(v) => (teamTags.has(v) ? "bg-green-600" : "bg-amber-400 !text-slate-900")}
        />
      </div>
    );

  const breaksCell = (si: number, sti: number, st: HyroxStationPlan) =>
    isExternal(st.station) ? (
      <span className="text-xs text-slate-300">—</span>
    ) : isMatrixStation(st.station) ? (
      <span className="text-[10px] text-slate-400">Break schedule ↓</span>
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
    );

  const coverCell = (si: number, sti: number, st: HyroxStationPlan) =>
    isExternal(st.station) ? (
      <span className="text-xs text-slate-300">—</span>
    ) : (
      <NameCell
        values={st.cover}
        onDropName={(n) => dropName(si, sti, "cover", n)}
        onRemove={(n) => removeName(si, sti, "cover", n)}
        onDragChip={() => { dragSrcRef.current = { si, sti, key: "cover" }; }}
        tap={{ src: { si, sti, key: "cover" }, picked, pick: tapPick, drop: () => cellTap(si, sti, "cover"), selected: isTarget(si, sti, "cover") }}
        chipClass={(v) => (teamTags.has(v) ? "bg-blue-600" : "bg-amber-400 !text-slate-900")}
      />
    );

  // In-range event dates, sorted — shared by the day dropdown and the PDF picker
  // so "DAY n" numbering matches the downloaded filenames
  const inRangeDates = days
    .map((d) => d.date)
    .filter(
      (dt) =>
        dt >= event.date.slice(0, 10) &&
        (!event.endDate || dt <= event.endDate.slice(0, 10))
    )
    .sort();

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Day selector — each HYROX day has its own tactic */}
      {days.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Day:</span>
          <Select
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            className="h-10 min-w-0 flex-1 px-2 pr-7 text-sm sm:h-9 sm:w-56 sm:flex-none sm:text-xs"
          >
            {days.map((d) => {
              const n = inRangeDates.indexOf(d.date);
              return (
                <option key={d.date} value={d.date}>
                  {n >= 0 ? `DAY ${n + 1} · ` : ""}{fmtDate(d.date)}{n < 0 ? " *" : ""}
                </option>
              );
            })}
          </Select>
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
          <label
            title="Pick a day, then download that day's tactic as a styled PDF"
            className="flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-600"
          >
            <Download size={12} />
            <select
              value=""
              onChange={(e) => {
                const d = e.target.value;
                if (!d) return;
                const a = document.createElement("a");
                a.href = `/api/events/${event.id}/tactic-pdf?date=${d}`;
                a.click();
              }}
              className="cursor-pointer bg-transparent text-xs font-semibold outline-none [&>option]:text-slate-900"
            >
              <option value="">PDF — pick day…</option>
              {inRangeDates.map((dt, i) => (
                <option key={dt} value={dt}>
                  DAY {i + 1} · {fmtDate(dt)}
                </option>
              ))}
            </select>
          </label>
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
                <label className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  <AlarmClock size={11} className="text-blue-500" />
                  <select
                    value=""
                    onFocus={loadTpl}
                    onChange={(e) => {
                      const t = (tplList || []).find((x) => x.id === e.target.value);
                      if (t) applyShiftBreakTemplate(si, t.body);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="">{tplList === null ? "Break template…" : "Break template…"}</option>
                    {(tplList || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                    {tplList !== null && tplList.length === 0 && (
                      <option value="" disabled>
                        No break templates — create one in Bookshelf
                      </option>
                    )}
                  </select>
                </label>
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
          <div className="hidden overflow-x-auto sm:block">
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
                    <td className="px-2 py-1.5">{photoCell(si, sti, st)}</td>
                    <td className="px-2 py-1.5">{breaksCell(si, sti, st)}</td>
                    <td className="px-2 py-1.5">{coverCell(si, sti, st)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: stacked station cards instead of the wide table */}
          <div className="space-y-2 px-3 pb-3 sm:hidden">
            {stations.map((st, sti) => (
              <div key={st.station} className="rounded-lg border border-slate-200">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                  <span className="text-sm font-bold text-slate-800">{st.station}</span>
                  <NoteEditor
                    label="Note"
                    value={st.note || ""}
                    onChange={(v) => setShiftStation(si, sti, { note: v })}
                  />
                </div>
                <div className="space-y-2.5 px-3 py-2.5">
                  <div>
                    {!isExternal(st.station) && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Photographers</p>
                    )}
                    {photoCell(si, sti, st)}
                  </div>
                  {!isExternal(st.station) && (
                    <>
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Breaks</p>
                        {breaksCell(si, sti, st)}
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Cover</p>
                        {coverCell(si, sti, st)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader
          title="Switch schedule"
          icon={<Users size={15} className="text-blue-600" />}
          action={
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => addSeparator()}><SeparatorHorizontal size={14} /> Separator</Button>
              <Button size="sm" variant="outline" onClick={addGroup}><Plus size={14} /> Group</Button>
            </div>
          }
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
                g.separator ? (
                  <tr key={g.id} className="bg-slate-100">
                    <td colSpan={maxP + 1} className="px-4 py-1.5">
                      <Input
                        value={g.name}
                        placeholder='Separator label — e.g. "Round 2"'
                        onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                        className="border-dashed bg-white/70 font-semibold"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex items-center gap-1">
                        <button
                          title="Insert separator above"
                          onClick={() => addSeparator(g.id)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100"
                        >
                          <SeparatorHorizontal size={14} />
                        </button>
                        <button title="Remove separator" onClick={() => removeGroup(g.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
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
                          const stations = (g.stations || []).slice(0, photographers.length);
                          updateGroup(g.id, { photographers: photographers.length ? photographers : [""], stations });
                        }}
                      />
                      <Select
                        value={g.stations?.[i] || ""}
                        onChange={(e) => {
                          const stations = Array.from({ length: Math.max(g.photographers.length, i + 1) }, (_, x) => g.stations?.[x] || "");
                          stations[i] = e.target.value;
                          updateGroup(g.id, { stations });
                        }}
                        className="mt-1 px-1 py-1 text-[11px] leading-tight"
                      >
                        <option value=""></option>
                        {HYROX_STATIONS.filter((st) => !isExternal(st)).map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </Select>
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
                      <button
                        title="Insert separator above"
                        onClick={() => addSeparator(g.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100"
                      >
                        <SeparatorHorizontal size={14} />
                      </button>
                      <button title="Remove group" onClick={() => removeGroup(g.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                )
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
          title="Break schedule — Station 1 - 3 (no jumper cover)"
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
                  Break schedule{tactic.shifts.length > 1 ? ` (Shift ${si + 1})` : ""}
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
                  <Button variant="outline" size="sm" onClick={() => setTplOpen((v) => !v)}>
                    <BookOpen size={12} className="mr-1" /> From Bookshelf
                  </Button>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => addBreakRow(si, station)}>
                    <Plus size={12} className="mr-1" /> break
                  </Button>
                </div>
                {tplOpen && (
                  <div className="rounded-md border border-blue-200 bg-blue-50/60 p-2.5">
                    {tplList === null ? (
                      <p className="text-xs text-slate-400">Loading templates…</p>
                    ) : tplList.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No break templates yet — create one in your{" "}
                        <a href="/bookshelf" className="font-medium text-blue-600 underline">Bookshelf</a>{" "}
                        with the &quot;HYROX breaks&quot; category.
                      </p>
                    ) : (
                      <div className="grid gap-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Applies to every station the template defines (Shift {si + 1})
                        </p>
                        {tplList.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyBreakTemplate(si, t.body)}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50/50"
                          >
                            <Download size={13} className="shrink-0 text-slate-400" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-800">{t.title}</span>
                              <span className="block truncate text-xs text-slate-400">
                                {breakTemplateSummary(parseBreakTemplate(t.body))}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                {/* Break pool — members of break stations in the shift being edited
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
                        Break stations{tactic.shifts.length > 1 ? ` — Shift ${si + 1}` : ""}
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
      {/* Photographer pool — docked bottom panel on mobile, sticky right column on desktop */}
      {event.photographers.length > 0 && (
        <aside className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-20 w-full shrink-0 space-y-2 md:bottom-auto md:top-20 md:w-60 md:self-start">
        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:shadow-none">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Team{picked?.name
              ? ` — ${picked.name} picked`
              : target
                ? ` — tap names → ${tactic.shifts[target.si]?.[target.sti]?.station || "selected box"}`
                : ""}
          </p>
          <div className="grid max-h-28 grid-cols-3 gap-1 overflow-y-auto md:max-h-[calc(100vh-140px)] md:grid-cols-2">
            {event.photographers.map((p) => {
              const tag = p.acronym || p.name;
              const covering = coveringSet.has(tag);
              const inS1 = !!shiftAssigned[0]?.has(tag);
              const inS2 = !!shiftAssigned[1]?.has(tag);
              const assigned = inS1 || inS2 || assignedSet.has(tag);
              // Split color: left half = shift 1, right half = shift 2 — but only when the
              // day genuinely runs two shifts (both have station assignments); a single-shift
              // day is always full green.
              const activeShifts = shiftAssigned.filter((s) => s.size > 0).length;
              const GREEN = "#16a34a", GREY = "#94a3b8";
              const bg = covering
                ? "#2563eb"
                : activeShifts > 1 && assigned && (inS1 || inS2) && !(inS1 && inS2)
                  ? `linear-gradient(to right, ${inS1 ? GREEN : GREY} 50%, ${inS2 ? GREEN : GREY} 50%)`
                  : assigned
                    ? GREEN
                    : GREY;
              return (
                <span
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", tag)}
                  onClick={() => poolTap(tag)}
                  title={
                    covering
                      ? "Covering (jumper)"
                      : inS1 && inS2
                        ? "Shooting in both shifts"
                        : inS1
                          ? "Shooting in Shift 1"
                          : inS2
                            ? "Shooting in Shift 2"
                            : "Drag or tap to assign"
                  }
                  style={{ background: bg }}
                  className={cn(
                    "cursor-grab truncate rounded px-2 py-1 text-left text-[11px] font-bold text-white active:cursor-grabbing",
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
                  key={`${a.name}-${a.station}-${a.kind === "shifts" ? a.date : a.dates.join("-")}`}
                  className="rounded bg-white/80 px-1.5 py-1 text-[10px] leading-tight text-amber-900 ring-1 ring-amber-200"
                >
                  <span className="font-bold">{a.name}</span> shoots{" "}
                  <span className="font-semibold">{a.station}</span>{" "}
                  {a.kind === "shifts" ? "twice the same day" : `${a.dates.length} days in a row`}
                  <span className="block text-amber-700">
                    {a.kind === "shifts"
                      ? `${fmtDate(a.date)} — ${a.shifts.map((si) => `Shift ${si + 1}`).join(" + ")}`
                      : a.dates.map((d) => fmtDate(d)).join(" → ")}
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
