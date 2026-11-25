// "HYROX breaks" bookshelf template — reusable break windows per station,
// stored as JSON in Template.body. Cover names are event-specific, so
// templates keep times only; "Covered by" is filled in per event.

import type { HyroxBreakRange, HyroxBreakRow, HyroxBreakTable } from "@/types";

export const BREAK_TPL_CATEGORY = "hyrox_breaks";

/** Stations that can hold break rows — all HYROX stations except the external
 *  LS-crewed ones (Farmers Carry, LS Arch). Mirrors `isExternal` in HyroxTactic. */
export const HYROX_BREAK_STATIONS = [
  "SkiErg",
  "Sled Push",
  "Sled Pull",
  "Burpees",
  "Rowing",
  "Sandbag Lunges",
  "Wall Ball",
  "Finish",
  "Hero Wall",
];

export interface BreakWindow {
  start: string; // "HH:MM"
  end: string;
}

/** Canonicalize a saved station name — strips " (optional)" and extra spaces,
 *  mirroring `normStation` in HyroxTactic. */
export const normStationName = (s: string) =>
  s.replace(/\s*\(optional\)\s*/i, " ").replace(/\s+/g, " ").trim();

/** station name → ordered break windows */
export type BreakTemplateData = Record<string, BreakWindow[]>;

const HHMM = /^\d{2}:\d{2}$/;

/** Parse template body → per-station windows. Always returns the three break
 *  station keys (empty arrays allowed); malformed bodies yield empty lists. */
export function parseBreakTemplate(body: string): BreakTemplateData {
  const out: BreakTemplateData = {};
  try {
    const raw = JSON.parse(body || "{}");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [station, list] of Object.entries(raw)) {
        if (!Array.isArray(list)) continue;
        const rows = list
          .filter(
            (w): w is BreakWindow =>
              !!w && typeof w === "object" && HHMM.test(w.start) && HHMM.test(w.end)
          )
          .map((w) => ({ start: w.start, end: w.end }));
        if (rows.length) out[station] = rows;
      }
    }
  } catch {
    // not JSON — treat as empty template
  }
  for (const s of HYROX_BREAK_STATIONS) out[s] ||= [];
  return out;
}

/** Serialize the editor state → JSON body. Invalid/empty windows are dropped. */
export function serializeBreakTemplate(data: BreakTemplateData): string {
  const clean: BreakTemplateData = {};
  for (const s of HYROX_BREAK_STATIONS) {
    const rows = (data[s] || []).filter((w) => HHMM.test(w.start) && HHMM.test(w.end));
    if (rows.length) clean[s] = rows.map(({ start, end }) => ({ start, end }));
  }
  return JSON.stringify(clean);
}

/** Normalize stored breaks to per-station rows. Handles two legacy shapes:
 *  flat HyroxBreak[] (station/photographer/start/end) and the shared-times
 *  matrix {times, rows: Record<station, string[]>} — a station owned a break
 *  window only when its cover cell was filled. */
export const normBreakTables = (b: unknown): HyroxBreakTable[] => {
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

/** One-line summary for cards/previews, e.g. "9 windows · 3 stations". */
export function breakTemplateSummary(data: BreakTemplateData): string {
  const stations = Object.values(data).filter((r) => r.length > 0).length;
  const windows = Object.values(data).reduce((n, r) => n + r.length, 0);
  if (!windows) return "Empty break template";
  return `${windows} window${windows === 1 ? "" : "s"} · ${stations} station${stations === 1 ? "" : "s"}`;
}
