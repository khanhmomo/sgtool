"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Wand2,
  Save,
  AlarmClock,
} from "lucide-react";
import { Button, Card, CardHeader, Empty, Input, Select, Textarea, Notice } from "@/components/ui";
import { uid, googleMapsUrl, fmtDate } from "@/lib/utils";
import type { TacticRow } from "@/types";
import type { TabProps } from "./EventWorkspace";
import HyroxTactic from "./HyroxTactic";

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

/** Inclusive YYYY-MM-DD date list from start → end (capped at 30 days). */
function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start) return out;
  const d = new Date(start + "T00:00:00");
  const stop = end ? new Date(end + "T00:00:00") : d;
  while (d <= stop && out.length < 30) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function TacticTab({ event, patch, setEvent, saving }: TabProps) {
  const isIronman = /ironman|triathlon/i.test(event.type);
  const isFitnessIndoor = /fitness\s*indoor/i.test(event.type);

  // Fitness Indoor: one tactic table per event day (tacticDays). Legacy events
  // stored in `tactic` seed day 1 on first open.
  const [days, setDays] = useState<{ date: string; rows: TacticRow[] }[]>(() => {
    if (!isFitnessIndoor) return [];
    const saved = event.tacticDays || [];
    // Days follow the event's start→end date range exactly; saved rows are
    // merged in for matching dates (stale saved days outside the range drop).
    const range = dateRange(event.date.slice(0, 10), (event.endDate || "").slice(0, 10));
    const sorted = range.length ? range : [saved[0]?.date || ""];
    return sorted.map((date, i) => ({
      date,
      rows:
        saved.find((d) => d.date === date)?.rows ??
        (i === 0 && !saved.length ? event.tactic || [] : []),
    }));
  });
  const [activeDate, setActiveDate] = useState(() => days[0]?.date ?? "");
  const [rowsState, setRowsState] = useState<TacticRow[]>(event.tactic || []);
  const [notes, setNotes] = useState(event.notes || "");
  const [dirty, setDirty] = useState(false);

  const rows = isFitnessIndoor
    ? (days.find((d) => d.date === activeDate)?.rows ?? [])
    : rowsState;
  const setRows = (fn: (rs: TacticRow[]) => TacticRow[]) => {
    if (isFitnessIndoor) {
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
    setDirty(true);
  }

  function addRow(spot = "") {
    setRows((rs) => [...rs, newRow(spot)]);
    setDirty(true);
  }

  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setDirty(true);
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
    setDirty(true);
  }

  function generate() {
    setRows((rs) => [...rs, ...(isFitnessIndoor ? fitnessIndoorSkeleton() : ironmanSkeleton())]);
    setDirty(true);
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
          title={isFitnessIndoor && activeDate ? `Tactic — ${fmtDate(activeDate)} (${rows.length} spots)` : `Race tactic (${rows.length} spots)`}
          icon={<ClipboardList size={15} className="text-blue-600" />}
          action={
            <div className="flex items-center gap-2">
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
              <Button
                size="sm"
                variant="accent"
                loading={saving}
                disabled={!dirty}
                onClick={() =>
                  patch(
                    isFitnessIndoor
                      ? { tacticDays: days.filter((d) => d.rows.length) }
                      : { tactic: rows }
                  ).then((ok) => ok && setDirty(false))
                }
              >
                Save
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

          {isFitnessIndoor && days.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {days.map((d) => (
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
                                      update(r.id, "mapLink", googleMapsUrl(pos.lat!, pos.lng!));
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
      </Card>

      {/* Call time — shown on the photographer page; stored as a schedule item */}
      <Card>
        <CardHeader title="Call time" icon={<AlarmClock size={15} className="text-blue-600" />} />
        <div className="flex flex-wrap items-end gap-3 p-4">
          {(() => {
            const ct = event.schedule.find((s) => /call|meet|brief/i.test(s.title));
            const setCall = (time: string, detail: string) => {
              const item = {
                id: ct?.id ?? uid(),
                day: "Race day",
                time,
                title: "Call time",
                detail,
              };
              return patch({
                schedule: ct
                  ? event.schedule.map((s) => (s.id === ct.id ? item : s))
                  : [...event.schedule, item],
              });
            };
            return (
              <>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
                  <Input
                    type="time"
                    defaultValue={to24(ct?.time || "")}
                    onBlur={(e) => setCall(from24(e.target.value), ct?.detail || "")}
                    className="h-8 w-28 px-2 text-xs"
                  />
                </div>
                <div className="min-w-52 flex-1">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Where</p>
                  <Input
                    defaultValue={ct?.detail || ""}
                    onBlur={(e) => setCall(ct?.time || "", e.target.value)}
                    placeholder="Meet at venue entrance…"
                    className="h-8 text-xs"
                  />
                </div>
              </>
            );
          })()}
        </div>
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
          <div className="flex justify-end">
            <Button size="sm" variant="accent" loading={saving} onClick={() => patch({ notes })}>
              <Save size={13} /> Save notes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
