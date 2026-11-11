"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Wand2,
  AlarmClock,
  Eye,
  EyeOff,
  Pencil,
  X,
} from "lucide-react";
import { Button, Card, CardHeader, Empty, Input, Select, Textarea, Notice } from "@/components/ui";
import { uid, spotMapUrl, fmtDate, dateRangeYmd } from "@/lib/utils";
import type { TacticCategory, TacticDay, TacticRow } from "@/types";
import type { TabProps } from "./EventWorkspace";
import HyroxTactic from "./HyroxTactic";
import { useAutosave } from "./autosave";

const LENS_OPTIONS = ["24-70 / 16-35", "70-200"];

/** 7 preset bold colors for the tactic table */
const SPOT_COLORS = [
  "#ffffff", // white / default
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // violet
];

/** "7:00 AM" → "07:00" for <input type="time"> */
function to24(t: string): string {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return /^\d{2}:\d{2}$/.test(t) ? t : "";
  let h = +m[1] % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** "07:00" (from <input type="time">) → "7:00 AM" for display/storage */
function from24(t: string): string {
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";
  const h = +m[1];
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m[2]} ${ap}`;
}

/** Standard IRONMAN / 70.3 spot skeleton in race order. */
function ironmanSkeleton(): TacticRow[] {
  const spots = [
    "Swim In",
    "Swim Out",
    "Transition 1",
    "Bike 1",
    "Bike 2",
    "Bike 3",
    "Transition 2",
    "Run 1",
    "Run 2",
    "Run 3",
    "Finish Line",
  ];
  return spots.map((spot) => ({
    id: uid(),
    spot,
    photographer: "",
    lens: "",
    arrival: "",
    mapLink: "",
    note: "",
    color: "",
    ls: "",
  }));
}

/** Fitness Indoor skeleton: Station 1–10, Finish, Hero Wall. */
function fitnessIndoorSkeleton(): TacticRow[] {
  const spots = [
    ...Array.from({ length: 10 }, (_, i) => `Station ${i + 1}`),
    "Finish",
    "Hero Wall",
  ];
  return spots.map((spot) => ({
    id: uid(),
    spot,
    photographer: "",
    lens: "",
    arrival: "",
    mapLink: "",
    note: "",
    color: "",
    ls: "",
  }));
}

const newRow = (spot = ""): TacticRow => ({
  id: uid(),
  spot,
  photographer: "",
  lens: "",
  arrival: "",
  mapLink: "",
  note: "",
  color: "",
  ls: "",
});

const dateRange = (start: string, end: string) => dateRangeYmd(start, end, 30);

export default function TacticTab({ event, patch, setEvent, saving }: TabProps) {
  const isIronman = /ironman|triathlon/i.test(event.type);
  const isFitnessIndoor = /fitness\s*indoor/i.test(event.type);
  // Any event spanning 2+ calendar days gets per-day tactic tables (each with its
  // own call time + day note) — plus the known multi-day types as a fallback for
  // events missing an endDate.
  const eventEnd = (event.endDate || "").slice(0, 10);
  const spansDays = !!eventEnd && eventEnd > event.date.slice(0, 10);
  const multiDay = spansDays || isFitnessIndoor || /obstacle/i.test(event.type);

  // Fitness Indoor: one tactic table per event day (tacticDays). Legacy events
  // stored in `tactic` seed day 1 on first open.
  const [days, setDays] = useState<TacticDay[]>(() => {
    if (!multiDay) return [];
    const saved = event.tacticDays || [];
    // Once the TL has added/removed tabs manually, the saved list is the source
    // of truth — auto date tabs are never re-generated behind their back.
    // (Labeled tabs also prove managed mode even if the flag is missing.)
    if (event.tacticManaged || saved.some((d) => d.label)) {
      return saved.map((d) => ({ ...d, published: !!d.published }));
    }
    // Days follow the event's start→end date range exactly; saved rows are
    // merged in for matching dates (stale saved days outside the range drop).
    const range = dateRange(event.date.slice(0, 10), (event.endDate || "").slice(0, 10));
    const sorted = range.length ? range : [saved[0]?.date || ""];
    return sorted.map((date, i) => {
      const match = saved.find((d) => d.date === date);
      return {
        date,
        rows: match?.rows ?? (i === 0 && !saved.length ? event.tactic || [] : []),
        callTime: match?.callTime || "",
        note: match?.note || "",
        published: !!match?.published,
      };
    });
  });
  // Tabs are keyed by label for named (category) tabs — dates can be edited
  // without detaching the active tab; plain date tabs key on the date.
  const dayKey = (d: TacticDay) => (d.label ? `|${d.label}` : `${d.date}|`);
  const [activeDate, setActiveDate] = useState(() => dayKey(days[0] || { date: "", rows: [] }));
  const byKey = (key: string) => days.find((d) => dayKey(d) === key);
  const [rowsState, setRowsState] = useState<TacticRow[]>(event.tactic || []);
  const [notes, setNotes] = useState(event.notes || "");
  useAutosave(rowsState, patch, (v) => ({ tactic: v }));
  // True once the TL adds/removes a tab — then saved tacticDays stay authoritative
  const [managed, setManaged] = useState(
    !!event.tacticManaged || !!(event.tacticDays || []).some((d) => d.label)
  );
  // Manual tab management — outdoor events only (HYROX/Fitness Indoor untouched)
  const canManageTabs = multiDay && !isFitnessIndoor;
  const eventRange = dateRange(event.date.slice(0, 10), (event.endDate || "").slice(0, 10));
  useAutosave(days, patch, (v) => ({
    // In-range event dates are always persisted — removing one tab must not
    // wipe the other (still empty) date tabs once the list is authoritative.
    tacticDays: v.filter(
      (d) => d.rows.length || d.callTime || d.note || d.published || d.label || (d.categories?.length ?? 0) > 0 || eventRange.includes(d.date)
    ),
    ...(managed ? { tacticManaged: true } : {}),
  }));
  useAutosave(notes, patch, (v) => ({ notes: v }));

  // Categories — named sub-tables inside a date tactic ("Kids race" etc.),
  // same role as shifts in the HYROX editor. "main" = the day's own rows.
  // Stored with the day key so switching days naturally falls back to "main".
  const [catTab, setCatTab] = useState({ key: activeDate, cat: "main" });
  const activeCat = catTab.key === activeDate ? catTab.cat : "main";
  const setActiveCat = (cat: string) => setCatTab({ key: activeDate, cat });
  const activeDay = byKey(activeDate);
  const cats = activeDay?.categories || [];

  const rows = multiDay
    ? activeCat === "main"
      ? (activeDay?.rows ?? [])
      : (cats.find((c) => c.id === activeCat)?.rows ?? [])
    : rowsState;
  const setDayField = (key: "callTime" | "note" | "published" | "date" | "endDate" | "mainName", value: string | boolean) => {
    if (!multiDay) return;
    setDays((ds) => ds.map((d) => (dayKey(d) === activeDate ? { ...d, [key]: value } : d)));
  };
  // Photographers only see a tactic once it's published
  const published = multiDay
    ? !!byKey(activeDate)?.published
    : !!event.tacticPublished;
  const togglePublished = () => {
    if (multiDay) setDayField("published", !published);
    else patch({ tacticPublished: !published });
  };
  const setRows = (fn: (rs: TacticRow[]) => TacticRow[]) => {
    if (multiDay) {
      setDays((ds) =>
        ds.map((d) => {
          if (dayKey(d) !== activeDate) return d;
          if (activeCat === "main") return { ...d, rows: fn(d.rows) };
          return {
            ...d,
            categories: (d.categories || []).map((c) =>
              c.id === activeCat ? { ...c, rows: fn(c.rows) } : c
            ),
          };
        })
      );
    } else {
      setRowsState(fn);
    }
  };

  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [mainEditOpen, setMainEditOpen] = useState(false);
  const [mainNameDraft, setMainNameDraft] = useState("");
  const [catEdit, setCatEdit] = useState<{ id: string; name: string } | null>(null);

  function renameCategory(id: string, name: string) {
    setDays((ds) =>
      ds.map((d) =>
        dayKey(d) === activeDate
          ? { ...d, categories: (d.categories || []).map((c) => (c.id === id ? { ...c, name } : c)) }
          : d
      )
    );
    setCatEdit(null);
  }

  function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const c: TacticCategory = { id: uid(), name, rows: [] };
    setDays((ds) =>
      ds.map((d) => (dayKey(d) === activeDate ? { ...d, categories: [...(d.categories || []), c] } : d))
    );
    setActiveCat(c.id);
    setNewCat("");
    setCatOpen(false);
  }

  function removeCategory(id: string) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Remove category "${c.name}"? Its rows will be deleted.`)) return;
    setDays((ds) =>
      ds.map((d) =>
        dayKey(d) === activeDate
          ? { ...d, categories: (d.categories || []).filter((x) => x.id !== id) }
          : d
      )
    );
    if (activeCat === id) setActiveCat("main");
  }

  const missingDates = eventRange.filter((dt) => !days.some((d) => d.date === dt && !d.label));
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const sortDays = (ds: TacticDay[]) =>
    [...ds].sort((a, b) => {
      if (!!a.label !== !!b.label) return a.label ? 1 : -1; // dates first, custom tabs last
      return a.date.localeCompare(b.date);
    });

  function removeDay(key: string) {
    const d = byKey(key);
    if (!d) return;
    if (!confirm(`Remove tactic "${d.label || fmtDate(d.date) || "tab"}"? Its rows will be deleted.`)) return;
    const next = days.filter((x) => dayKey(x) !== key);
    setDays(next);
    setManaged(true);
    if (activeDate === key) setActiveDate(dayKey(next[0] || { date: "", rows: [] }));
  }

  function addDateTab(date: string) {
    const d: TacticDay = { date, rows: [], callTime: "", note: "" };
    setDays((ds) => sortDays([...ds, d]));
    setManaged(true);
    setActiveDate(dayKey(d));
    setAddOpen(false);
  }

  function addCustomTab() {
    const label = newLabel.trim();
    if (!label) return;
    const d: TacticDay = { date: "", label, rows: [], callTime: "", note: "" };
    setDays((ds) => sortDays([...ds, d]));
    setManaged(true);
    setActiveDate(dayKey(d));
    setNewLabel("");
    setAddOpen(false);
  }
  // rows whose spot cell shows a free-form input instead of the position dropdown
  const [customLinkRows, setCustomLinkRows] = useState<Set<string>>(new Set());
  const [customLensRows, setCustomLensRows] = useState<Set<string>>(new Set());
  const [openColorRow, setOpenColorRow] = useState<string | null>(null);

  function update(id: string, key: keyof TacticRow, value: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  // Clone another day's full tactic (rows, call time, day note) into the
  // active day — rows get fresh ids; publish state of the target day is kept.
  const dayLabel = (d?: TacticDay) =>
    d ? d.label || (d.date ? fmtDate(d.date) : "Unscheduled") : "";

  function cloneDay(fromKey: string) {
    const src = byKey(fromKey);
    if (!src) return;
    setDays((ds) =>
      ds.map((d) =>
        dayKey(d) === activeDate
          ? {
              ...d,
              rows: src.rows.map((r) => ({ ...r, id: uid() })),
              callTime: src.callTime,
              note: src.note,
              categories: (src.categories || []).map((c) => ({
                ...c,
                id: uid(),
                rows: c.rows.map((r) => ({ ...r, id: uid() })),
              })),
            }
          : d
      )
    );
  }

  function addRow(spot = "") {
    setRows((rs) => [...rs, newRow(spot)]);
  }

  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function generate() {
    setRows((rs) => [...rs, ...(isFitnessIndoor ? fitnessIndoorSkeleton() : ironmanSkeleton())]);
  }

  const unassigned = rows.filter((r) => !r.photographer).length;

  // HYROX uses a completely different tactic layout (stations / shifts / switches / breaks)
  if (/hyrox/i.test(event.type)) {
    return <HyroxTactic event={event} patch={patch} setEvent={setEvent} saving={saving} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader
          title={multiDay && activeDate ? `Tactic — ${dayLabel(byKey(activeDate))} (${rows.length} spots)` : `Race tactic (${rows.length} spots)`}
          icon={<ClipboardList size={15} className="text-blue-600" />}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePublished}
                title={published ? "Visible on the photographer link — click to hide" : "Hidden from photographers — click to publish"}
                className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${published ? "bg-emerald-500" : "bg-slate-300"}`}
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
              {isIronman && (
                <Button size="sm" variant="outline" onClick={generate}>
                  <Wand2 size={14} /> IRONMAN skeleton
                </Button>
              )}
              {isFitnessIndoor && (
                <Button size="sm" variant="outline" onClick={generate}>
                  <Wand2 size={14} /> Station template
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => addRow()}>
                <Plus size={14} /> Add spot
              </Button>
            </div>
          }
        />
        <div className="p-4">
          {event.photographers.length === 0 && (
            <Notice kind="info" className="mb-3">
              Add your team in the Team tab first — then assign each spot to a photographer here.
            </Notice>
          )}
          {rows.length > 0 && unassigned > 0 && (
            <Notice kind="info" className="mb-3">
              {unassigned} spot{unassigned === 1 ? "" : "s"} still unassigned.
            </Notice>
          )}

          {multiDay && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {days.map((d) => (
                <span key={dayKey(d)} className="relative inline-flex">
                  <button
                    onClick={() => setActiveDate(dayKey(d))}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      canManageTabs ? "pl-3 pr-6" : "px-3"
                    } ${
                      dayKey(d) === activeDate
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {dayLabel(d)}
                  </button>
                  {canManageTabs && (
                    <button
                      onClick={() => removeDay(dayKey(d))}
                      title="Remove this tactic tab"
                      className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 ${
                        dayKey(d) === activeDate
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-300 hover:text-red-500"
                      }`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              ))}
              {canManageTabs && (
                <div className="relative">
                  <Button size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
                    <Plus size={13} /> Tactic
                  </Button>
                  {addOpen && (
                    <>
                      <button
                        aria-label="Close"
                        onClick={() => setAddOpen(false)}
                        className="fixed inset-0 z-10 cursor-default"
                      />
                      <div className="absolute left-0 top-9 z-20 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                        {missingDates.length > 0 && (
                          <>
                            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Event day
                            </p>
                            {missingDates.map((dt) => (
                              <button
                                key={dt}
                                onClick={() => addDateTab(dt)}
                                className="block w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                {fmtDate(dt)}
                              </button>
                            ))}
                            <div className="my-1.5 border-t border-slate-100" />
                          </>
                        )}
                        <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Custom (e.g. 100K)
                        </p>
                        <div className="flex gap-1">
                          <Input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addCustomTab()}
                            placeholder="Tab name…"
                            className="h-8 text-xs"
                          />
                          <Button size="sm" variant="outline" onClick={addCustomTab} disabled={!newLabel.trim()}>
                            Add
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {byKey(activeDate)?.label && (
                  <>
                    <span className="text-xs text-slate-500">Dates</span>
                    <Input
                      type="date"
                      value={byKey(activeDate)?.date || ""}
                      onChange={(e) => setDayField("date", e.target.value)}
                      className="h-9 w-36 text-xs"
                    />
                    <span className="text-xs text-slate-400">–</span>
                    <Input
                      type="date"
                      value={byKey(activeDate)?.endDate || ""}
                      onChange={(e) => setDayField("endDate", e.target.value)}
                      className="h-9 w-36 text-xs"
                    />
                  </>
                )}
                <AlarmClock size={13} className="text-slate-400" />
                <span className="text-xs text-slate-500">
                  Call time{activeDate ? ` — ${dayLabel(byKey(activeDate))}` : ""}
                </span>
                <Input
                  type="time"
                  value={byKey(activeDate)?.callTime || ""}
                  onChange={(e) => setDayField("callTime", e.target.value)}
                  className="h-9 w-28 text-xs"
                />
              </div>
              {days.length > 1 && (
                <Select
                  value=""
                  onChange={(e) => { if (e.target.value) cloneDay(e.target.value); }}
                  className="h-9 w-40 text-xs"
                  title="Clone another day's tactic into this day"
                >
                  <option value="">Copy day from…</option>
                  {days
                    .filter((d) => dayKey(d) !== activeDate)
                    .map((d) => (
                      <option key={dayKey(d)} value={dayKey(d)}>
                        {dayLabel(d)}
                      </option>
                    ))}
                </Select>
              )}
            </div>
          )}

          {/* Category sub-tabs — multiple races inside one date tactic */}
          {multiDay && activeDay && (canManageTabs || cats.length > 0) && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Category
              </span>
              <button
                onClick={() => setActiveCat("main")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  activeCat === "main"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {activeDay.mainName || "Race"}
              </button>
              {canManageTabs && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setMainNameDraft(activeDay.mainName || "");
                      setMainEditOpen((v) => !v);
                    }}
                    title="Rename the main table"
                    className="rounded-md p-1 text-slate-400 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil size={11} />
                  </button>
                  {mainEditOpen && (
                    <>
                      <button
                        aria-label="Close"
                        onClick={() => setMainEditOpen(false)}
                        className="fixed inset-0 z-10 cursor-default"
                      />
                      <div className="absolute left-0 top-7 z-20 flex w-48 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                        <Input
                          value={mainNameDraft}
                          onChange={(e) => setMainNameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setDayField("mainName", mainNameDraft.trim());
                              setMainEditOpen(false);
                            }
                          }}
                          placeholder="Race"
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDayField("mainName", mainNameDraft.trim());
                            setMainEditOpen(false);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {cats.map((c) => (
                <span key={c.id} className="relative inline-flex">
                  <button
                    onClick={() => setActiveCat(c.id)}
                    className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${
                      canManageTabs ? "pl-2.5 pr-8" : "px-2.5"
                    } ${
                      activeCat === c.id
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {c.name}
                  </button>
                  {canManageTabs && (
                    <>
                      <button
                        onClick={() => setCatEdit({ id: c.id, name: c.name })}
                        title="Rename category"
                        className={`absolute right-4 top-1/2 -translate-y-1/2 rounded p-0.5 ${
                          activeCat === c.id
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-300 hover:text-slate-600"
                        }`}
                      >
                        <Pencil size={9} />
                      </button>
                      <button
                        onClick={() => removeCategory(c.id)}
                        title="Remove this category"
                        className={`absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 ${
                          activeCat === c.id
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-300 hover:text-red-500"
                        }`}
                      >
                        <X size={10} />
                      </button>
                    </>
                  )}
                </span>
              ))}
              {catEdit && (
                <>
                  <button
                    aria-label="Close"
                    onClick={() => setCatEdit(null)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="relative z-20 flex w-48 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                    <Input
                      autoFocus
                      value={catEdit.name}
                      onChange={(e) => setCatEdit({ ...catEdit, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && catEdit.name.trim() && renameCategory(catEdit.id, catEdit.name.trim())}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!catEdit.name.trim()}
                      onClick={() => renameCategory(catEdit.id, catEdit.name.trim())}
                    >
                      Save
                    </Button>
                  </div>
                </>
              )}
              {canManageTabs && (
                <div className="relative">
                  <button
                    onClick={() => setCatOpen((v) => !v)}
                    className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-dashed ring-slate-300 hover:bg-slate-100"
                  >
                    + Category
                  </button>
                  {catOpen && (
                    <>
                      <button
                        aria-label="Close"
                        onClick={() => setCatOpen(false)}
                        className="fixed inset-0 z-10 cursor-default"
                      />
                      <div className="absolute left-0 top-8 z-20 flex w-48 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                        <Input
                          value={newCat}
                          onChange={(e) => setNewCat(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCategory()}
                          placeholder="e.g. Kids race"
                          className="h-8 text-xs"
                        />
                        <Button size="sm" variant="outline" onClick={addCategory} disabled={!newCat.trim()}>
                          Add
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {rows.length === 0 ? (
            <Empty
              icon={<ClipboardList size={26} />}
              title="No tactic yet"
              hint={
                isIronman
                  ? "Generate the IRONMAN spot skeleton (Swim In → Finish Line) or add spots manually, then assign photographers."
                  : isFitnessIndoor
                    ? "Generate the Station template (Station 1–10, Finish, Hero Wall) or add spots manually, then assign photographers."
                    : "Add spots, then assign photographers."
              }
              action={
                isIronman || isFitnessIndoor ? (
                  <Button size="sm" variant="accent" onClick={generate}>
                    <Wand2 size={14} /> {isFitnessIndoor ? "Generate Station template" : "Generate IRONMAN skeleton"}
                  </Button>
                ) : (
                  <Button size="sm" variant="accent" onClick={() => addRow()}>
                    <Plus size={14} /> Add spot
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-2 py-2 w-16">Order</th>
                    <th className="px-2 py-2 w-12">Color</th>
                    <th className="px-3 py-2">Spot</th>
                    <th className="px-3 py-2">Photographer</th>
                    {isFitnessIndoor && <th className="px-3 py-2 w-16">LS</th>}
                    <th className="px-3 py-2">Camera lens</th>
                    {!isFitnessIndoor && <th className="px-3 py-2">Arrival</th>}
                    <th className="px-3 py-2">Note</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const acrs = r.photographer.split(",").map((s) => s.trim()).filter(Boolean);
                    const mate = acrs.every((a) =>
                      event.photographers.some((p) => p.acronym === a)
                    ) || acrs.length === 0;
                    return (
                      <tr
                        key={r.id}
                        style={r.color ? { background: r.color } : undefined}
                        className="border-b border-slate-100 last:border-0 align-top"
                      >
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-0.5">
                            <button
                              title="Move up"
                              onClick={() => move(r.id, -1)}
                              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              title="Move down"
                              onClick={() => move(r.id, 1)}
                              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="relative">
                            <button
                              title="Row color"
                              onClick={() =>
                                setOpenColorRow((o) => (o === r.id ? null : r.id))
                              }
                              style={{ background: r.color || "#ffffff" }}
                              className={`h-7 w-7 shrink-0 cursor-pointer rounded border p-0.5 ${
                                r.color ? "border-slate-400" : "border-slate-300"
                              }`}
                            />
                            {openColorRow === r.id && (
                              <>
                                <button
                                  aria-label="Close color picker"
                                  onClick={() => setOpenColorRow(null)}
                                  className="fixed inset-0 z-10 cursor-default"
                                />
                                <div className="absolute left-0 top-8 z-20 flex gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                                  {SPOT_COLORS.map((c) => (
                                    <button
                                      key={c}
                                      title={c === "#ffffff" ? "No color" : c}
                                      onClick={() => {
                                        update(r.id, "color", c === "#ffffff" ? "" : c);
                                        setOpenColorRow(null);
                                      }}
                                      style={{ background: c }}
                                      className={`h-5 w-5 shrink-0 rounded-full border transition-transform ${
                                        (r.color || "#ffffff") === c
                                          ? "scale-110 border-slate-900 ring-1 ring-slate-900"
                                          : "border-slate-300 hover:scale-110"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {isFitnessIndoor ? (
                            <Input
                              value={r.spot}
                              onChange={(e) => update(r.id, "spot", e.target.value)}
                              placeholder="e.g. Station 3"
                              className="h-9 w-44 text-xs font-semibold"
                            />
                          ) : (() => {
                            const withCoords = event.positions.filter(
                              (p) => p.lat !== null && p.lng !== null
                            );
                            const matched = withCoords.find(
                              (p) => (p.photographer || p.id) === r.spot
                            );
                            const custom =
                              customLinkRows.has(r.id) || (!!r.spot && !matched);
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                <Select
                                  value={custom ? "__custom" : (matched?.id ?? "")}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "__custom") {
                                      setCustomLinkRows((s) => new Set(s).add(r.id));
                                      return;
                                    }
                                    setCustomLinkRows((s) => {
                                      const n = new Set(s);
                                      n.delete(r.id);
                                      return n;
                                    });
                                    if (!v) {
                                      update(r.id, "spot", "");
                                      update(r.id, "mapLink", "");
                                      return;
                                    }
                                    const pos = withCoords.find((p) => p.id === v);
                                    if (pos) {
                                      update(r.id, "spot", pos.photographer || pos.id);
                                      update(r.id, "mapLink", spotMapUrl(pos.lat!, pos.lng!));
                                    }
                                  }}
                                  className="h-9 w-44 text-xs font-semibold"
                                >
                                  <option value="">Pick a spot…</option>
                                  {withCoords.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.photographer || p.id}
                                    </option>
                                  ))}
                                  <option value="__custom">Custom…</option>
                                </Select>
                                </div>
                                {custom && (
                                  <Input
                                    value={r.spot}
                                    onChange={(e) => update(r.id, "spot", e.target.value)}
                                    placeholder="Spot name"
                                    className="h-9 w-44 text-xs"
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={r.photographer}
                            onChange={(e) => update(r.id, "photographer", e.target.value)}
                            className="h-9 w-32 text-xs"
                          >
                            <option value="">— unassigned —</option>
                            {event.photographers.map((p) => (
                              <option key={p.id} value={p.acronym}>
                                {p.acronym} — {p.name}
                              </option>
                            ))}
                          </Select>
                          {r.photographer && !mate && (
                            <p className="mt-0.5 text-[10px] font-medium text-amber-600">
                              not in team
                            </p>
                          )}
                        </td>
                        {isFitnessIndoor && (
                          <td className="px-3 py-2">
                            {(() => {
                              const selected = (r.ls || "").split(",").map((s) => s.trim()).filter(Boolean);
                              const key = `ls-${r.id}`;
                              return (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setOpenColorRow((o) => (o === key ? null : key))}
                                    className="flex h-8 min-w-16 items-center truncate rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-blue-500"
                                  >
                                    <span className="truncate">
                                      {selected.length ? selected.join(", ") : "+ LS"}
                                    </span>
                                  </button>
                                  {openColorRow === key && (
                                    <>
                                      <button
                                        aria-label="Close"
                                        onClick={() => setOpenColorRow(null)}
                                        className="fixed inset-0 z-10 cursor-default"
                                      />
                                      <div className="absolute left-0 top-9 z-20 max-h-52 w-52 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                                        <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                          LS crew for this spot
                                        </p>
                                        {event.photographers.map((p) => {
                                          const on = selected.includes(p.acronym);
                                          return (
                                            <label
                                              key={p.id}
                                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={on}
                                                onChange={() => {
                                                  const next = on
                                                    ? selected.filter((a) => a !== p.acronym)
                                                    : [...selected, p.acronym];
                                                  update(r.id, "ls", next.join(", "));
                                                }}
                                                className="h-3.5 w-3.5 accent-blue-600"
                                              />
                                              <span className="font-bold">{p.acronym}</span>
                                              <span className="truncate text-slate-500">{p.name}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          {(() => {
                            const custom = customLensRows.has(r.id) || (!!r.lens && !LENS_OPTIONS.includes(r.lens));
                            return (
                              <div className="space-y-1">
                                <Select
                                  value={custom ? "__custom" : r.lens}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "__custom") {
                                      setCustomLensRows((s) => new Set(s).add(r.id));
                                      return;
                                    }
                                    setCustomLensRows((s) => { const n = new Set(s); n.delete(r.id); return n; });
                                    update(r.id, "lens", v);
                                  }}
                                  className="h-9 w-32 text-xs"
                                >
                                  <option value="">—</option>
                                  {LENS_OPTIONS.map((l) => (
                                    <option key={l} value={l}>{l}</option>
                                  ))}
                                  <option value="__custom">Other…</option>
                                </Select>
                                {custom && (
                                  <Input
                                    value={r.lens}
                                    onChange={(e) => update(r.id, "lens", e.target.value)}
                                    placeholder="e.g. 100-400, 35mm…"
                                    className="h-9 w-32 text-xs"
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        {!isFitnessIndoor && (
                          <td className="px-3 py-2">
                            <Input
                              type="time"
                              value={to24(r.arrival)}
                              onChange={(e) => update(r.id, "arrival", from24(e.target.value))}
                              className="h-9 w-28 px-2 text-xs"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <Input
                            value={r.note}
                            onChange={(e) => update(r.id, "note", e.target.value)}
                            placeholder="Setup LS if available…"
                            className="h-9 w-52 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            title="Delete spot"
                            onClick={() => removeRow(r.id)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {multiDay && (
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold text-slate-500">
              Day note {activeDate ? `— ${dayLabel(byKey(activeDate))}` : ""}
            </p>
            <Textarea
              value={byKey(activeDate)?.note || ""}
              onChange={(e) => setDayField("note", e.target.value)}
              rows={2}
              placeholder="Note for this day's tactic (weather, venue access, shift plan…)"
            />
          </div>
        )}
      </Card>

      {/* General notes */}
      <Card>
        <CardHeader title="General notes" />
        <div className="space-y-2 p-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder={"# Race day notes\n- Support **bold**, *italic*, [links](https://…)\n- Headings with # ## ###\n- Bullet and numbered lists"}
          />
          <p className="text-xs text-slate-400">Autosaves as you type.</p>
        </div>
      </Card>
    </div>
  );
}
