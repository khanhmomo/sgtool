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
import { uid, googleMapsUrl } from "@/lib/utils";
import type { TacticRow } from "@/types";
import type { TabProps } from "./EventWorkspace";

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
});

export default function TacticTab({ event, patch, saving }: TabProps) {
  const [rows, setRows] = useState<TacticRow[]>(event.tactic || []);
  const [notes, setNotes] = useState(event.notes || "");
  const [dirty, setDirty] = useState(false);
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
    const existing = rows.length ? [...rows] : [];
    setRows([...existing, ...ironmanSkeleton()]);
    setDirty(true);
  }

  const unassigned = rows.filter((r) => !r.photographer).length;
  const isIronman = /ironman|triathlon/i.test(event.type);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader
          title={`Race tactic (${rows.length} spots)`}
          icon={<ClipboardList size={15} className="text-blue-600" />}
          action={
            <div className="flex items-center gap-2">
              {isIronman && (
                <Button size="sm" variant="outline" onClick={generate}>
                  <Wand2 size={14} /> IRONMAN skeleton
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
                onClick={() => patch({ tactic: rows }).then((ok) => ok && setDirty(false))}
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

          {rows.length === 0 ? (
            <Empty
              icon={<ClipboardList size={26} />}
              title="No tactic yet"
              hint={
                isIronman
                  ? "Generate the IRONMAN spot skeleton (Swim In → Finish Line) or add spots manually, then assign photographers."
                  : "Add spots, then assign photographers."
              }
              action={
                isIronman ? (
                  <Button size="sm" variant="accent" onClick={generate}>
                    <Wand2 size={14} /> Generate IRONMAN skeleton
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
                    <th className="px-3 py-2">Camera lens</th>
                    <th className="px-3 py-2">Arrival</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const mate = event.photographers.find(
                      (p) => p.acronym === r.photographer
                    );
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
                          {(() => {
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
                        <td className="px-3 py-2">
                          <Input
                            type="time"
                            value={to24(r.arrival)}
                            onChange={(e) => update(r.id, "arrival", from24(e.target.value))}
                            className="h-8 w-28 px-2 text-xs"
                          />
                        </td>
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
