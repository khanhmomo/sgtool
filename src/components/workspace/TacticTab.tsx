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
} from "lucide-react";
import { Button, Card, CardHeader, Empty, Input, Select, Textarea, Notice } from "@/components/ui";
import { uid, spotMapUrl, fmtDate, dateRangeYmd } from "@/lib/utils";
import type { TacticDay, TacticRow } from "@/types";
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
      };
    });
  });
  const [activeDate, setActiveDate] = useState(() => days[0]?.date ?? "");
  const [rowsState, setRowsState] = useState<TacticRow[]>(event.tactic || []);
  const [notes, setNotes] = useState(event.notes || "");
  useAutosave(rowsState, patch, (v) => ({ tactic: v }));
  useAutosave(days, patch, (v) => ({
    tacticDays: v.filter((d) => d.rows.length || d.callTime || d.note || d.published),
  }));
  useAutosave(notes, patch, (v) => ({ notes: v }));

  const rows = multiDay
    ? (days.find((d) => d.date === activeDate)?.rows ?? [])
    : rowsState;
  const setDayField = (key: "callTime" | "note" | "published", value: string | boolean) => {
    if (!multiDay) return;
    setDays((ds) => ds.map((d) => (d.date === activeDate ? { ...d, [key]: value } : d)));
  };
  // Photographers only see a tactic once it's published
  const published = multiDay
    ? !!days.find((d) => d.date === activeDate)?.published
    : !!event.tacticPublished;
  const togglePublished = () => {
    if (multiDay) setDayField("published", !published);
    else patch({ tacticPublished: !published });
  };
  const setRows = (fn: (rs: TacticRow[]) => TacticRow[]) => {
    if (multiDay) {
      setDays((ds) => ds.map((d) => (d.date === activeDate ? { ...d, rows: fn(d.rows) } : d)));
    } else {
      setRowsState(fn);
    }
  };
  // rows whose spot cell shows a free-form input instead of the position dropdown
  const [customLinkRows, setCustomLinkRows] = useState<Set<string>>(new Set());
  const [openColorRow, setOpenColorRow] = useState<string | null>(null);

  function update(id: string, key: keyof TacticRow, value: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
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
          title={multiDay && activeDate ? `Tactic — ${fmtDate(activeDate)} (${rows.length} spots)` : `Race tactic (${rows.length} spots)`}
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
              {days.length > 1 &&
                days.map((d) => (
                  <button
                    key={d.date || "day"}
                    onClick={() => setActiveDate(d.date)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      d.date === activeDate
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {d.date ? fmtDate(d.date) : "Unscheduled"}
                  </button>
                ))}
              <div className="ml-auto flex items-center gap-1.5">
                <AlarmClock size={13} className="text-slate-400" />
                <span className="text-xs text-slate-500">
                  Call time{days.length > 1 && activeDate ? ` — ${fmtDate(activeDate)}` : ""}
                </span>
                <Input
                  type="time"
                  value={days.find((d) => d.date === activeDate)?.callTime || ""}
                  onChange={(e) => setDayField("callTime", e.target.value)}
                  className="h-7 w-28 text-xs"
                />
              </div>
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
                              className="h-8 w-44 text-xs font-semibold"
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
                                  className="h-8 w-44 text-xs font-semibold"
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
                                    className="h-7 w-44 text-xs"
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
                            className="h-8 w-32 text-xs"
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
                          <Select
                            value={r.lens}
                            onChange={(e) => update(r.id, "lens", e.target.value)}
                            className="h-8 w-32 text-xs"
                          >
                            <option value="">—</option>
                            {LENS_OPTIONS.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </Select>
                        </td>
                        {!isFitnessIndoor && (
                          <td className="px-3 py-2">
                            <Input
                              type="time"
                              value={to24(r.arrival)}
                              onChange={(e) => update(r.id, "arrival", from24(e.target.value))}
                              className="h-8 w-28 px-2 text-xs"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <Input
                            value={r.note}
                            onChange={(e) => update(r.id, "note", e.target.value)}
                            placeholder="Setup LS if available…"
                            className="h-8 w-52 text-xs"
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
              Day note {activeDate ? `— ${fmtDate(activeDate)}` : ""}
            </p>
            <Textarea
              value={days.find((d) => d.date === activeDate)?.note || ""}
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
