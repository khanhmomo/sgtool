"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Route,
  Upload,
  MapPin,
  Copy,
  Check,
  Trash2,
  Pencil,
  Plus,
  X,
  ExternalLink,
  Crosshair,
  ListChecks,
  CircleAlert,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Empty,
  Field,
  Input,
  Notice,
  Select,
} from "@/components/ui";
import { SPORT_META } from "@/lib/design";
import { cn, fmtDistances, googleMapsUrl } from "@/lib/utils";
import { analyzePosition } from "@/lib/geo";
import { extractCoords, parseLatLngText } from "@/lib/coords";
import type { Position, PositionAnalysis } from "@/types";
import type { TabProps } from "./EventWorkspace";

const CourseMap = dynamic(() => import("@/components/CourseMap"), { ssr: false });

/** Same 7 bold colors used for tactic rows */
const SPOT_COLORS = [
  "#64748b", // slate (visible on map instead of white)
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // violet
];

type EditingPosition = Position & { __isNew?: boolean };

export default function CourseTab({ event, patch, saving }: TabProps) {
  const [positions, setPositions] = useState<Position[]>(event.positions);
  const [course, setCourse] = useState(event.course);
  const [editing, setEditing] = useState<EditingPosition | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCourse, setShowCourse] = useState(true);
  const [showPositions, setShowPositions] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [openColorLeg, setOpenColorLeg] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gpxError, setGpxError] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const legs = course?.legs || [];

  // ── persistence ──────────────────────────────────────────────────────────
  async function savePositions(next: Position[]) {
    setPositions(next);
    await patch({ positions: next });
  }

  // ── GPX upload ───────────────────────────────────────────────────────────
  async function uploadGpx(files: File[]) {
    setGpxError("");
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        // merge=1 appends the file's legs to any existing course
        fd.append("merge", "1");
        const res = await fetch(`/api/events/${event.id}/gpx`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setGpxError(data.error || `Unable to parse ${file.name}. Check that it is a valid GPX file.`);
          continue;
        }
        setCourse(data.event.course);
        setPositions(data.event.positions);
      }
    } catch {
      setGpxError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function updateLeg(i: number, patchLeg: { color?: string; name?: string }) {
    if (!course) return;
    const next = {
      ...course,
      legs: course.legs.map((l, j) => (j === i ? { ...l, ...patchLeg } : l)),
    };
    setCourse(next);
    await patch({ course: next });
  }

  async function removeLeg(i: number) {
    if (!course) return;
    const next = { ...course, legs: course.legs.filter((_, j) => j !== i) };
    setCourse(next);
    await patch({ course: next });
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;

  // ── editing ──────────────────────────────────────────────────────────────
  function nextSpotId(existing: Position[]): string {
    let n = existing.length + 1;
    while (existing.some((p) => p.id === `S${n}`)) n++;
    return `S${n}`;
  }

  /** Distances + sport derived from the course for given coords (empty if none). */
  function deriveFromCourse(lat: number | null, lng: number | null): { distances: number[]; sport: Position["sport"] } {
    const analysis =
      legs.length && lat !== null && lng !== null ? analyzePosition(legs, lat, lng) : null;
    return {
      distances: analysis?.candidates?.length
        ? analysis.candidates.map((c) => round1(c.km))
        : analysis
          ? [round1(analysis.nearestKm)]
          : [],
      sport:
        analysis?.candidates?.[0]?.sport ||
        legs[analysis?.nearestLeg ?? 0]?.sport ||
        "other",
    };
  }

  function newPosition(lat?: number, lng?: number): EditingPosition {
    // Auto-derive distances/sport from the course when coords are known
    const { distances, sport } = deriveFromCourse(lat ?? null, lng ?? null);
    return {
      id: nextSpotId(positions),
      photographer: "", // repurposed as the free-text spot name
      sport,
      section: "",
      distances,
      lat: lat ?? null,
      lng: lng ?? null,
      mapLink: lat !== undefined && lng !== undefined ? googleMapsUrl(lat, lng) : "",
      notes: "",
      status: "draft",
      __isNew: true,
    };
  }

  /** Paste a maps link → try local extraction, else ask the server to resolve it */
  async function resolveMapLink(url: string, base: EditingPosition) {
    setResolveError("");
    const direct = extractCoords(url) || parseLatLngText(url);
    if (direct) {
      const { distances, sport } = deriveFromCourse(direct.lat, direct.lng);
      setEditing({ ...base, mapLink: url, lat: direct.lat, lng: direct.lng, distances, sport });
      return;
    }
    if (!url.trim()) {
      setEditing({ ...base, mapLink: url });
      return;
    }
    setResolving(true);
    try {
      const res = await fetch("/api/parse-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [{ url }] }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (r?.ok && r.lat !== null && r.lat !== undefined) {
        const { distances, sport } = deriveFromCourse(r.lat, r.lng);
        setEditing({ ...base, mapLink: url, lat: r.lat, lng: r.lng, distances, sport });
      } else {
        setEditing({ ...base, mapLink: url });
        setResolveError("Couldn't get coordinates from this link — enter lat/lng manually.");
      }
    } catch {
      setEditing({ ...base, mapLink: url });
      setResolveError("Couldn't resolve link — enter lat/lng manually.");
    } finally {
      setResolving(false);
    }
  }

  async function saveEditing() {
    if (!editing) return;
    const { __isNew, ...clean } = editing;
    void __isNew;
    // Spot ID mirrors the spot name; append a counter if another spot has it
    const base = clean.photographer.trim() || clean.id;
    let newId = base;
    for (let n = 2; positions.some((p) => p.id === newId && p.id !== editing.id); n++) {
      newId = `${base} (${n})`;
    }
    clean.id = newId;
    const next = editing.__isNew
      ? [...positions, clean]
      : positions.map((p) => (p.id === editing.id ? clean : p));
    await savePositions(next);
    setEditing(null);
  }

  function removePosition(id: string) {
    savePositions(positions.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  // ── copy helpers ─────────────────────────────────────────────────────────
  const lineFor = (p: Position) =>
    `${p.photographer || p.id} — ${fmtDistances(p.distances)}`;

  async function copyOne(p: Position) {
    await navigator.clipboard.writeText(lineFor(p)).catch(() => {});
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function copyAll() {
    const text = positions.map(lineFor).join("\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  async function exportTxt() {
    const text = `${event.name} — Position list\nGenerated ${new Date().toLocaleString()}\n\n${positions.map(lineFor).join("\n")}\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${event.name.replace(/[^a-z0-9]+/gi, "-")}-positions.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportCsv() {
    const rows = [
      ["id", "photographer", "sport", "section", "distances_km", "lat", "lng", "map_link", "notes", "status"],
      ...positions.map((p) => [
        p.id, p.photographer, p.sport, p.section,
        p.distances.join(" / "), p.lat ?? "", p.lng ?? "", p.mapLink, p.notes, p.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${event.name.replace(/[^a-z0-9]+/gi, "-")}-positions.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const analysis: PositionAnalysis | null =
    editing && legs.length && editing.lat !== null && editing.lng !== null
      ? analyzePosition(legs, editing.lat, editing.lng)
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* ── GPX / Course ── */}
      <Card>
        <CardHeader
          title="GPX course"
          icon={<Route size={15} className="text-blue-600" />}
          action={
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={showCourse}
                  onChange={(e) => setShowCourse(e.target.checked)}
                  className="accent-blue-600"
                />
                Route
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={showPositions}
                  onChange={(e) => setShowPositions(e.target.checked)}
                  className="accent-blue-600"
                />
                Positions
              </label>
              <input
                ref={fileInput}
                type="file"
                accept=".gpx,.xml"
                multiple
                className="hidden"
                onChange={(e) => e.target.files?.length && uploadGpx(Array.from(e.target.files))}
              />
              <Button
                size="sm"
                variant="accent"
                loading={uploading}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={14} /> {course ? "Add GPX" : "Upload GPX"}
              </Button>
            </div>
          }
        />
        <div className="p-4">
          {gpxError && <Notice kind="error" className="mb-3">{gpxError}</Notice>}
          {course ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{course.fileName}</span>
              </div>
              <div className="mb-3 space-y-1.5">
                {legs.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        title="Path color"
                        onClick={() => setOpenColorLeg(openColorLeg === i ? null : i)}
                        className="h-6 w-8 shrink-0 rounded border border-slate-300"
                        style={{ background: l.color || SPORT_META[l.sport]?.line || SPORT_META.other.line }}
                      />
                      {openColorLeg === i && (
                        <div className="absolute left-0 top-7 z-30 flex gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                          {SPOT_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                updateLeg(i, { color: c });
                                setOpenColorLeg(null);
                              }}
                              className="h-5 w-5 rounded border border-slate-200 hover:scale-110"
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      value={l.name}
                      onChange={(e) => {
                        const next = { ...course!, legs: course!.legs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) };
                        setCourse(next);
                      }}
                      onBlur={(e) => updateLeg(i, { name: e.target.value })}
                      className="h-7 w-40 text-xs"
                    />
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {SPORT_META[l.sport]?.label || l.sport}
                    </span>
                    <span className="text-xs text-slate-500">{l.distanceKm.toFixed(1)} km</span>
                    <button
                      onClick={() => removeLeg(i)}
                      title="Remove this GPX track"
                      className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <CourseMap
                legs={legs}
                positions={positions}
                showCourse={showCourse}
                showPositions={showPositions}
                selectedId={selectedId}
                onSelectPosition={(id) => {
                  setSelectedId(id);
                  const p = positions.find((x) => x.id === id);
                  if (p) setEditing({ ...p });
                }}
                onMapClick={(lat, lng) => {
                  if (addMode) {
                    setEditing(newPosition(lat, lng));
                    setAddMode(false);
                  }
                }}
              />
              <p className="mt-2 text-xs text-slate-400">
                {addMode
                  ? "Click anywhere on the map to place a new spot."
                  : "Click a marker to edit that spot."}
              </p>
            </>
          ) : (
            <Empty
              icon={<Route size={26} />}
              title="No course uploaded"
              hint="Upload the .gpx course files (swim, bike, run…) — they combine into one map, and you can recolor each track."
              action={
                <Button size="sm" variant="accent" loading={uploading} onClick={() => fileInput.current?.click()}>
                  <Upload size={14} /> Upload GPX
                </Button>
              }
            />
          )}
        </div>
      </Card>

      {/* ── Position list ── */}
      <Card>
        <CardHeader
          title={`Position list (${positions.length})`}
          icon={<ListChecks size={15} className="text-blue-600" />}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={addMode ? "accent" : "outline"} onClick={() => setAddMode((m) => !m)}>
                <Crosshair size={14} /> {addMode ? "Click map…" : "Place on map"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(newPosition())}>
                <Plus size={14} /> Add
              </Button>
              <Button size="sm" variant="outline" onClick={exportTxt} disabled={!positions.length}>
                TXT
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={!positions.length}>
                CSV
              </Button>
              <Button size="sm" variant="primary" onClick={copyAll} disabled={!positions.length}>
                {copiedAll ? <Check size={14} /> : <Copy size={14} />}
                {copiedAll ? "Copied!" : "Copy all"}
              </Button>
            </div>
          }
        />
        <div className="divide-y divide-slate-100">
          {positions.length === 0 && (
            <div className="p-4">
              <Empty
                icon={<MapPin size={26} />}
                title="No spots yet"
                hint="Add a spot or place one directly on the course map."
              />
            </div>
          )}
          {positions.map((p) => {
            const meta = SPORT_META[p.sport] || SPORT_META.other;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 px-4 py-2.5",
                  selectedId === p.id && "bg-blue-50/60"
                )}
              >
                <span
                  className="flex h-6 max-w-52 items-center truncate rounded px-2 text-[11px] font-bold text-white"
                  style={{ background: meta.hex }}
                  title={p.photographer || p.id}
                >
                  {p.photographer || p.id}
                </span>
                <span className="font-mono text-xs text-slate-500">{fmtDistances(p.distances)}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400">
                  {p.lat !== null && p.lng !== null ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : "no coords"}
                </span>
                {p.status === "confirmed" ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">confirmed</Badge>
                ) : (
                  <Badge className="border-slate-200 bg-slate-50 text-slate-500">draft</Badge>
                )}
                <div className="flex items-center gap-1">
                  {p.lat !== null && p.lng !== null && (
                    <button
                      title="Copy coordinates"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${p.lat}, ${p.lng}`).catch(() => {});
                        setCopiedId(`g:${p.id}`);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      {copiedId === `g:${p.id}` ? <Check size={14} className="text-emerald-600" /> : <MapPin size={14} />}
                    </button>
                  )}
                  <button title="Copy line" onClick={() => copyOne(p)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    {copiedId === p.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                  {p.lat !== null && p.lng !== null && (
                    <a
                      title="Open in Google Maps"
                      href={googleMapsUrl(p.lat, p.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button title="Edit" onClick={() => setEditing({ ...p })} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <Pencil size={14} />
                  </button>
                  <button title="Delete" onClick={() => removePosition(p.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Position editor modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none sm:rounded-lg">
            <CardHeader
              title={editing.__isNew ? "New spot" : `Edit ${editing.id}`}
              action={
                <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                  <X size={16} />
                </button>
              }
            />
            <div className="grid gap-4 p-4">
              <Field label="Spot name">
                <Input
                  value={editing.photographer}
                  onChange={(e) => setEditing({ ...editing, photographer: e.target.value })}
                  placeholder="e.g. Chakan bridge — outbound"
                  autoFocus
                />
              </Field>

              <Field label="Map link">
                <Input
                  value={editing.mapLink}
                  onChange={(e) => setEditing({ ...editing, mapLink: e.target.value })}
                  onBlur={(e) => resolveMapLink(e.target.value, editing)}
                  placeholder="https://maps.google.com/…"
                />
                {resolving && (
                  <p className="mt-1 text-[11px] text-blue-600">Getting coordinates…</p>
                )}
                {resolveError && (
                  <p className="mt-1 text-[11px] text-amber-600">{resolveError}</p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <Input
                    value={editing.lat ?? ""}
                    onBlur={(e) => {
                      const lat = e.target.value === "" ? null : parseFloat(e.target.value);
                      const { distances, sport } = deriveFromCourse(lat, editing.lng);
                      setEditing({ ...editing, lat, distances: distances.length ? distances : editing.distances, sport });
                    }}
                    onChange={(e) =>
                      setEditing({ ...editing, lat: e.target.value === "" ? null : parseFloat(e.target.value) })
                    }
                    placeholder="31.23041"
                    className="font-mono"
                  />
                </Field>
                <Field label="Longitude">
                  <Input
                    value={editing.lng ?? ""}
                    onBlur={(e) => {
                      const lng = e.target.value === "" ? null : parseFloat(e.target.value);
                      const { distances, sport } = deriveFromCourse(editing.lat, lng);
                      setEditing({ ...editing, lng, distances: distances.length ? distances : editing.distances, sport });
                    }}
                    onChange={(e) =>
                      setEditing({ ...editing, lng: e.target.value === "" ? null : parseFloat(e.target.value) })
                    }
                    placeholder="121.47370"
                    className="font-mono"
                  />
                </Field>
              </div>

              {/* Course analysis */}
              {legs.length > 0 && editing.lat !== null && editing.lng !== null && (
                <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 text-xs">
                  {analysis ? (
                    <>
                      <p className="mb-1 font-semibold text-slate-800">
                        Nearest course point:{" "}
                        <span className="font-mono">{legs[analysis.nearestLeg]?.name} — {analysis.nearestKm.toFixed(1)} km</span>
                      </p>
                      <p className="mb-2 text-slate-500">
                        {Math.round(analysis.distToCourseM)} m off course
                        {analysis.distToCourseM > 25 && (
                          <span className="ml-1 inline-flex items-center gap-1 font-medium text-amber-600">
                            <CircleAlert size={11} /> verify manually
                          </span>
                        )}
                      </p>
                      {analysis.candidates.length > 0 && (
                        <>
                          <p className="mb-1 font-semibold text-slate-700">
                            Possible course distances{analysis.candidates.length > 1 ? " (loop!)" : ""}:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.candidates.map((c, i) => {
                              const km = round1(c.km);
                              const active = editing.distances.some((d) => Math.abs(d - km) < 0.15);
                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    const next = active
                                      ? editing.distances.filter((d) => Math.abs(d - km) >= 0.15)
                                      : [...editing.distances, km].sort((a, b) => a - b);
                                    setEditing({ ...editing, distances: next, sport: c.sport });
                                  }}
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors",
                                    active
                                      ? "border-blue-600 bg-blue-600 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:border-blue-400"
                                  )}
                                >
                                  {c.legName} · {km.toFixed(1)} km
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">Outside course corridor — set distances manually.</p>
                  )}
                </div>
              )}

              <Field label="Distances (km) — multiple for loops">
                <Input
                  value={editing.distances.join(" / ")}
                  onChange={(e) => {
                    const ds = e.target.value
                      .split(/[\/,;\s]+/)
                      .map((x) => parseFloat(x))
                      .filter((x) => isFinite(x));
                    setEditing({ ...editing, distances: ds });
                  }}
                  placeholder="2.5 / 7.2"
                  className="font-mono"
                />
              </Field>
              <Field label="Note">
                <Input
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Stand at bridge exit, shoot towards skyline"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as Position["status"] })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                </Select>
              </Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  loading={saving}
                  onClick={saveEditing}
                  disabled={!editing.photographer.trim()}
                >
                  Save spot
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
