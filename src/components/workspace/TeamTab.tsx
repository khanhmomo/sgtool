"use client";

import { useRef, useState } from "react";
import { Camera, Users, Plus, Trash2, FileUp, X } from "lucide-react";
import { Button, Card, CardHeader, Empty, Input, Notice } from "@/components/ui";
import { uid } from "@/lib/utils";
import type { Photographer } from "@/types";
import type { TabProps } from "./EventWorkspace";
import { useAutosave } from "./autosave";

const ROLES = ["Photographer", "Team Leader", "Second Shooter", "Drone", "Video", "Runner"];

export default function TeamTab({ event, patch }: TabProps) {
  const [team, setTeam] = useState<Photographer[]>(event.photographers);
  useAutosave(team, patch, (v) => ({ photographers: v }));
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [equipIdx, setEquipIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** CSV equipment cells are ", "-separated lists (e.g. "A9III, A1") */
  const equipItems = (s?: string) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

  /** "Sony 24-70 f/2.8 GM mark II" → "24-70 f/2.8" — strip brand + marketing suffixes */
  const shortLens = (s: string): string => {
    // Focal range/prime + aperture, e.g. "24-70 f/2.8", "35mm F1.4", "70-200mm f/2.8"
    const m = s.match(/(\d[\d.,-]*\d)\s*(mm)?\s*f\/?\s*([\d.]+)/i);
    if (m) return `${m[1]} f/${m[3]}`;
    // No aperture — keep focal only, e.g. "Sony 16mm"
    const f = s.match(/(\d[\d.,-]*\d)\s*mm/i);
    if (f) return `${f[1]}mm`;
    return s;
  };

  function update(i: number, k: keyof Photographer, val: string) {
    setTeam((t) => t.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  }

  function addRow(acronym = "") {
    setTeam((t) => [
      ...t,
      { id: uid(), acronym: acronym.toUpperCase(), name: "", phone: "", email: "", role: "Photographer", vehicle: "", notes: "" },
    ]);
  }

  // RFC-4180-ish splitter — handles quoted cells containing commas/newlines
  function splitLine(line: string, sep: string) {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === sep && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  }

  function findCol(header: string[], ...names: string[]) {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    return header.findIndex((h) => names.some((n) => norm(h) === norm(n)));
  }

  async function importFile(f: File) {
    setImportMsg(null);
    const text = (await f.text()).replace(/^\uFEFF/, ""); // strip BOM
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setImportMsg({ kind: "error", text: "CSV looks empty — need a header row plus data rows." });
      return;
    }
    const sep = lines[0].includes("\t") && !lines[0].includes(",") ? "\t" : ",";
    const header = splitLine(lines[0], sep);

    const iAcr = findCol(header, "Acronym");
    const iFirst = findCol(header, "First Name", "Firstname", "First");
    const iLast = findCol(header, "Last Name", "Lastname", "Last");
    const iEmail = findCol(header, "Email", "E-mail");
    const iPhone = findCol(header, "Phone", "Phone Number", "Mobile");
    const iCameras = findCol(header, "Cameras", "Camera");
    const iLenses = findCol(header, "Lenses", "Lens");
    const iFlashes = findCol(header, "Flashes", "Flash");
    const iRemote = findCol(header, "Has remote camera", "Remote camera", "Remote");

    if (iAcr < 0) {
      setImportMsg({ kind: "error", text: 'No "Acronym" column found in the header row.' });
      return;
    }

    const existing = new Set(team.map((p) => p.acronym.toUpperCase()));
    const added: Photographer[] = [];
    const equipPatch = new Map<string, Pick<Photographer, "cameras" | "lenses" | "flashes" | "remoteCamera">>();
    let skipped = 0;
    for (const line of lines.slice(1)) {
      const cells = splitLine(line, sep);
      const acronym = (cells[iAcr] || "").toUpperCase();
      if (!acronym) continue;
      const equip = {
        cameras: iCameras >= 0 ? cells[iCameras] || "" : "",
        lenses: iLenses >= 0 ? cells[iLenses] || "" : "",
        flashes: iFlashes >= 0 ? cells[iFlashes] || "" : "",
        remoteCamera: iRemote >= 0 ? cells[iRemote] || "" : "",
      };
      // Duplicate acronym — merge equipment into the existing member instead of dropping it
      if (existing.has(acronym)) {
        if (equip.cameras || equip.lenses || equip.flashes || equip.remoteCamera) equipPatch.set(acronym, equip);
        else skipped++;
        continue;
      }
      const name = [iFirst >= 0 ? cells[iFirst] : "", iLast >= 0 ? cells[iLast] : ""]
        .filter(Boolean)
        .join(" ")
        .trim();
      added.push({
        id: uid(),
        acronym,
        name,
        phone: iPhone >= 0 ? cells[iPhone] || "" : "",
        cameras: iCameras >= 0 ? cells[iCameras] || "" : "",
        lenses: iLenses >= 0 ? cells[iLenses] || "" : "",
        flashes: iFlashes >= 0 ? cells[iFlashes] || "" : "",
        remoteCamera: iRemote >= 0 ? cells[iRemote] || "" : "",
        email: iEmail >= 0 ? cells[iEmail] || "" : "",
        role: "Photographer",
        vehicle: "",
        notes: "",
      });
      existing.add(acronym);
    }

    if (added.length || equipPatch.size) {
      setTeam((t) => [
        ...t.map((p) => equipPatch.get(p.acronym.toUpperCase()) ? { ...p, ...equipPatch.get(p.acronym.toUpperCase()) } : p),
        ...added,
      ]);
    }
    setImportMsg(
      added.length || equipPatch.size
        ? { kind: "ok", text: `Imported ${added.length} photographer${added.length === 1 ? "" : "s"}${equipPatch.size ? `, updated equipment for ${equipPatch.size} existing member${equipPatch.size === 1 ? "" : "s"}` : ""}${skipped ? `, skipped ${skipped}` : ""} — saved automatically.` }
        : { kind: "error", text: skipped ? "All rows were duplicates of existing acronyms." : "No photographers found in the file." }
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader
          title="Photographer roster"
          icon={<Users size={15} className="text-blue-600" />}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addRow()}>
                <Plus size={14} /> Add
              </Button>
            </div>
          }
        />
        <div className="space-y-2 p-4">
          {team.length === 0 && (
            <Empty
              icon={<Users size={26} />}
              title="No photographers yet"
              hint="Add your team — acronyms are used for position IDs (e.g. AKT_01)."
              action={
                <Button size="sm" variant="accent" onClick={() => addRow()}>
                  <Plus size={14} /> Add photographer
                </Button>
              }
            />
          )}
          {team.map((p, i) => (
            <div
              key={p.id}
              className="grid items-center gap-2 rounded-md border border-slate-200 bg-slate-50/50 p-2 sm:grid-cols-[80px_1fr_130px_1fr_140px_140px_auto]"
            >
              <Input
                value={p.acronym}
                onChange={(e) => update(i, "acronym", e.target.value.toUpperCase())}
                placeholder="AKT"
                className="h-8 text-xs font-bold uppercase"
                maxLength={6}
              />
              <Input value={p.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Name" className="h-8 text-xs" />
              <Input value={p.phone} onChange={(e) => update(i, "phone", e.target.value)} placeholder="Phone" className="h-8 text-xs" />
              <Input value={p.email} onChange={(e) => update(i, "email", e.target.value)} placeholder="Email" className="h-8 text-xs" />
              <Input
                value={p.role}
                onChange={(e) => update(i, "role", e.target.value)}
                placeholder="Role"
                list={`roles-${p.id}`}
                className="h-8 text-xs"
              />
              <datalist id={`roles-${p.id}`}>
                {ROLES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <div className="flex items-center gap-1">
                <Input value={p.vehicle} onChange={(e) => update(i, "vehicle", e.target.value)} placeholder="Vehicle" className="h-8 text-xs" />
                <button
                  title="Show equipment"
                  onClick={() => setEquipIdx(i)}
                  className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Camera size={14} />
                </button>
              </div>
              <button
                onClick={() => {
                  setTeam((t) => t.filter((_, j) => j !== i));
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Import from CSV" icon={<FileUp size={15} className="text-blue-600" />} />
        <div className="space-y-2 p-4">
          <Notice kind="info">
            Upload your dispatch sheet (CSV from em2.sportograf.com)
          </Notice>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/tab-separated-values"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp size={14} /> Choose CSV file
          </Button>
          {importMsg && <Notice kind={importMsg.kind}>{importMsg.text}</Notice>}
        </div>
      </Card>

      {equipIdx !== null && team[equipIdx] && (() => {
        const p = team[equipIdx];
        const cams = equipItems(p.cameras);
        const lenses = equipItems(p.lenses);
        const flashes = equipItems(p.flashes);
        const remote = p.remoteCamera?.trim();
        return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setEquipIdx(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Camera size={15} className="text-blue-600" />
                <span className="inline-flex h-5 min-w-10 items-center justify-center rounded bg-slate-900 px-1.5 text-[11px] font-bold text-white">
                  {p.acronym}
                </span>
                {p.name || "—"}
                {remote && /^(y|yes|true|1)$/i.test(remote) && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                    Remote cam
                  </span>
                )}
              </p>
              <button onClick={() => setEquipIdx(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-3">
              {(
                [
                  ["Cameras", cams.map((x) => x)],
                  ["Lenses", lenses.map(shortLens)],
                  ["Flashes", flashes.map((x) => x)],
                ] as const
              ).map(([label, items]) => (
                <div key={label} className="rounded-md bg-slate-50 p-2">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  {items.length ? (
                    <div className="flex flex-wrap gap-1">
                      {items.map((it, i) => (
                        <span key={i} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
                          {it}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
