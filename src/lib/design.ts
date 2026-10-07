import type { DocCategory, EventStatus, Sport } from "@/types";

// ── Centralized design tokens ──────────────────────────────────────────────
// Single source of truth for sport colors, status colors, and category colors.
// Never hardcode colors in components — import from here.

export const SPORTS: Sport[] = ["swim", "bike", "run", "other"];

export const SPORT_META: Record<
  Sport,
  { label: string; hex: string; badge: string; line: string }
> = {
  swim: {
    label: "Swim",
    hex: "#0ea5e9",
    badge: "bg-sky-500",
    line: "#0ea5e9",
  },
  bike: {
    label: "Bike",
    hex: "#2563eb",
    badge: "bg-blue-600",
    line: "#2563eb",
  },
  run: {
    label: "Run",
    hex: "#dc2626",
    badge: "bg-red-600",
    line: "#dc2626",
  },
  other: {
    label: "Other",
    hex: "#475569",
    badge: "bg-slate-600",
    line: "#475569",
  },
};

export function sportOf(s: string | undefined | null): Sport {
  const v = (s || "").toLowerCase();
  if (v.includes("swim")) return "swim";
  if (v.includes("bike") || v.includes("cycle")) return "bike";
  if (v.includes("run") || v.includes("run") || v.includes("walk")) return "run";
  if (v === "swim" || v === "bike" || v === "run" || v === "other") return v as Sport;
  return "other";
}

export const STATUS_META: Record<
  EventStatus,
  { label: string; badge: string; dot: string }
> = {
  planning: { label: "PLANNING", badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  ready: { label: "READY", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-600" },
  live: { label: "LIVE", badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-600" },
  completed: { label: "COMPLETED", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600" },
  archived: { label: "ARCHIVED", badge: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

export const DOC_CATEGORY_META: Record<
  DocCategory | "strategy",
  { label: string; badge: string }
> = {
  tactic: { label: "Tactic", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  guide: { label: "Guide", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  checklist: { label: "Checklist", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  note: { label: "Note", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  strategy: { label: "Strategy", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  other: { label: "Other", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const TRANSPORT_KINDS: Record<string, string> = {
  "airport-hotel": "Airport → Hotel",
  "hotel-venue": "Hotel → Venue",
  "venue-hotel": "Venue → Hotel",
  other: "Other",
};
