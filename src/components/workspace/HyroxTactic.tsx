"use client";

import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { cn, fmtDate, uid } from "@/lib/utils";
import type { HyroxBreakRange, HyroxBreakTable, HyroxDayPlan, HyroxStationPlan, HyroxSwitchGroup, HyroxTactic } from "@/types";
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

/** External-crew stations — photographer chips come from +LS free-text input, no breaks */
const EXTERNAL_STATIONS = new Set(["Farmers Carry", "LS Arch"]);

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
});

/** Chip list + drop target used in Photographers / Cover cells */
function NameCell({
  values,
  onDropName,
  onRemove,
  chipClass,
  droppable = true,
}: {
  values: string[];
  onDropName: (name: string) => void;
  onRemove: (name: string) => void;
  chipClass: (v: string) => string;
  droppable?: boolean;
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
          className={cn("group inline-flex h-5 items-center gap-0.5 rounded px-1.5 text-[11px] font-bold text-white", chipClass(v))}
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

const fmtT = (t: string) => {
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return t;
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

/** Read-only tactic view for the photographer site */
export function HyroxPublicView({ hyrox, team, callTime }: { hyrox: HyroxTactic; team?: string[]; callTime?: string }) {
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
                    <td className="border border-slate-900 px-3 py-2 font-bold whitespace-nowrap">{st.station}</td>
                    <td className="border border-slate-900 px-3 py-2">
                      {st.photographers.length || (st.ls || []).length ? (
                        <div className="flex flex-wrap gap-1">
                          {st.photographers.map((p, i) => (
                            <span key={i} className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold", chip(p, "bg-green-600"))}>{teamSet.has(p) ? p : `${p} LS`}</span>
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
                <div className="flex flex-wrap items-center gap-1">
                  {st.photographers.length || (st.ls || []).length
                    ? <>
                        {st.photographers.map((p, i) => (
                          <span key={i} className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold", chip(p, "bg-green-600"))}>{teamSet.has(p) ? p : `${p} LS`}</span>
                        ))}
                        {(st.ls || []).map((p, i) => (
                          <span key={`ls-${i}`} className="inline-flex h-5 items-center rounded bg-amber-400 px-1.5 text-[11px] font-bold text-slate-900">{p} LS</span>
                        ))}
                      </>
                    : <span className="text-[11px] opacity-40">—</span>}
                  {(st.breaks || []).length > 0 && (
                    <span className="ml-auto text-[10px] font-bold opacity-80">
                      {(st.breaks as HyroxBreakRange[]).map((b) => `${fmtT(b.start)}–${fmtT(b.end)}`).join(" · ")}
                    </span>
                  )}
                </div>
                {st.cover.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Cover</span>
                    {st.cover.map((c, i) => (
                      <span key={i} className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold", chip(c, "bg-blue-600"))}>{c}</span>
                    ))}
                  </div>
                )}
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

/** Inclusive YYYY-MM-DD range */
function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start) return out;
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${(end && end >= start ? end : start)}T00:00:00`);
  for (let i = 0; i < 60 && d <= last; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function HyroxTactic({ event, patch, saving }: TabProps) {
  const [days, setDays] = useState<HyroxDayPlan[]>(() => {
    // Days follow the event's start→end date range exactly; saved hyrox entries
    // merge in for matching dates (stale saved days outside the range drop).
    const range = dateRange(event.date.slice(0, 10), (event.endDate || "").slice(0, 10));
    const dates = range.length ? range : (event.hyrox || []).map((d) => d.date).filter(Boolean);
    return [...new Set(dates)].sort().map((date) => ({
      date,
      callTime: event.hyrox?.find((x) => x.date === date)?.callTime || "",
      tactic: normTactic(event.hyrox?.find((x) => x.date === date)?.tactic || defaultTactic()),
    }));
  });
  const [activeDate, setActiveDate] = useState(days[0]?.date || "");

  const day = days.find((d) => d.date === activeDate);
  const tactic = day?.tactic || defaultTactic();

  const setCallTime = (v: string) => {
    const nextDays = days.map((d) => (d.date === activeDate ? { ...d, callTime: v } : d));
    setDays(nextDays);
    patch({ hyrox: nextDays });
  };

  // Every change auto-saves — no explicit save button
  const touch = (next: HyroxTactic) => {
    const nextDays = days.map((d) => (d.date === activeDate ? { ...d, tactic: next } : d));
    setDays(nextDays);
    patch({ hyrox: nextDays });
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

  /** Add a dragged name: photographers dedupe within the shift, cover allows repeats across stations */
  const addName = (si: number, sti: number, key: "photographers" | "cover" | "ls", name: string) => {
    const shift = tactic.shifts[si];
    if (key === "photographers") {
      if (shift.some((s) => s.photographers.includes(name))) return;
      if (shift[sti].photographers.includes(name)) return;
    } else if (key === "ls") {
      // LS may reuse team members who are already assigned to a station —
      // only dedupe within LS lists so the same person isn't LS twice.
      if (shift.some((s) => (s.ls || []).includes(name))) return;
    } else if (shift[sti].cover.includes(name)) {
      return;
    }
    setShiftStation(si, sti, { [key]: [...(shift[sti][key] || []), name] });
  };
  const removeName = (si: number, sti: number, key: "photographers" | "cover" | "ls", name: string) =>
    setShiftStation(si, sti, { [key]: tactic.shifts[si][sti][key].filter((n) => n !== name) });

  const maxP = Math.max(1, ...tactic.switchGroups.map((g) => g.photographers.length));

  // Pool status: assigned to a station → green, covering → blue, free → grey
  const assignedSet = new Set(tactic.shifts.flat().flatMap((s) => [...s.photographers, ...(s.ls || [])]));
  const coveringSet = new Set(tactic.shifts.flat().flatMap((s) => s.cover));
  /** Team acronym/name tags — anything else in a cell is an external (LS) */
  const teamTags = new Set(event.photographers.map((p) => p.acronym || p.name));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Day selector — each HYROX day has its own tactic */}
      {days.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Day:</span>
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => setActiveDate(d.date)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                d.date === activeDate ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              )}
            >
              {fmtDate(d.date)}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500">
            Call time
            <Input
              type="time"
              value={day?.callTime || ""}
              onChange={(e) => setCallTime(e.target.value)}
              className="h-7 w-24 px-1.5 text-xs"
            />
          </span>
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
                    <td className="px-4 py-1.5 font-medium text-slate-700">{st.station}</td>
                    <td className="px-2 py-1.5">
                      {EXTERNAL_STATIONS.has(st.station) ? (
                        /* External crew — whole cell is an LS drop zone */
                        <NameCell
                          values={st.photographers}
                          onDropName={(n) => addName(si, sti, "photographers", n)}
                          onRemove={(n) => removeName(si, sti, "photographers", n)}
                          chipClass={() => "bg-amber-400 !text-slate-900"}
                        />
                      ) : st.station === "Finish" ? (
                        /* Split cell: photographers zone | LS zone */
                        <div className="grid grid-cols-2 divide-x divide-slate-200">
                          <div className="pr-2">
                            <NameCell
                              values={st.photographers}
                              onDropName={(n) => addName(si, sti, "photographers", n)}
                              onRemove={(n) => removeName(si, sti, "photographers", n)}
                              chipClass={(v) => (teamTags.has(v) ? "bg-green-600" : "bg-amber-400 !text-slate-900")}
                            />
                          </div>
                          <div className="pl-2">
                            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">LS</p>
                            <NameCell
                              values={st.ls || []}
                              onDropName={(n) => addName(si, sti, "ls", n)}
                              onRemove={(n) => removeName(si, sti, "ls", n)}
                              chipClass={() => "bg-amber-400 !text-slate-900"}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <NameCell
                            values={st.photographers}
                            onDropName={(n) => addName(si, sti, "photographers", n)}
                            onRemove={(n) => removeName(si, sti, "photographers", n)}
                            chipClass={(v) => (teamTags.has(v) ? "bg-green-600" : "bg-amber-400 !text-slate-900")}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {EXTERNAL_STATIONS.has(st.station) ? (
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
                      {EXTERNAL_STATIONS.has(st.station) ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <NameCell
                          values={st.cover}
                          onDropName={(n) => addName(si, sti, "cover", n)}
                          onRemove={(n) => removeName(si, sti, "cover", n)}
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
      </Card>

      <Card>
        <CardHeader
          title="Break schedule — Stations 1–3 (self-managed, no jumper cover)"
          icon={<Users size={15} className="text-blue-600" />}
        />
        <div className="space-y-4 px-4 pb-4">
          {tactic.shifts.map((_, si) => {
            const t = breakTable(si);
            const times = t.times || [];
            const rows = t.rows || {};
            return (
              <div key={si}>
                <div className="mb-1.5 flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {tactic.shifts.length > 1 ? `Shift ${si + 1}` : "Breaks"}
                  </p>
                  <button
                    onClick={() => addBreakCol(si)}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Plus size={12} /> break
                  </button>
                </div>
                {times.length > 0 && (
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                          <th className="w-28 px-2 py-1.5">Station</th>
                          {times.map((br, bi) => (
                            <th key={bi} className="px-1 py-1.5">
                              <div className="flex items-center gap-0.5">
                                <Input
                                  type="time"
                                  value={br.start}
                                  className="h-6 w-[62px] px-0.5 text-[10px]"
                                  onChange={(e) => setBreakTime(si, bi, { start: e.target.value })}
                                />
                                <span className="text-[10px] text-slate-300">–</span>
                                <Input
                                  type="time"
                                  value={br.end}
                                  className="h-6 w-[62px] px-0.5 text-[10px]"
                                  onChange={(e) => setBreakTime(si, bi, { end: e.target.value })}
                                />
                                <button
                                  title="Remove break"
                                  onClick={() => removeBreakCol(si, bi)}
                                  className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {BREAK_STATIONS.map((station) => (
                          <tr key={station}>
                            <td className="px-3 py-1.5 font-medium text-slate-700">
                              {station} <span className="text-[10px] font-normal text-slate-400">(optional)</span>
                            </td>
                            {times.map((_, bi) => (
                              <td key={bi} className="px-2 py-1.5">
                                <Input
                                  className="h-6 w-14 px-1 text-[11px]"
                                  placeholder="—"
                                  value={(rows[station] || [])[bi] || ""}
                                  onChange={(e) => setBreakCell(si, station, bi, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      </div>
      {/* Photographer pool — sticky right column, drag onto any cell */}
      {event.photographers.length > 0 && (
        <aside className="sticky top-20 w-36 shrink-0 rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Team</p>
          <div className="flex flex-col gap-1">
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
        </aside>
      )}
      </div>
      {saving && <p className="text-right text-xs text-slate-400">Saving…</p>}
    </div>
  );
}
