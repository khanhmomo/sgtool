"use client";

import { useRef, useState } from "react";
import { Users, Plus, Trash2, FileUp } from "lucide-react";
import { Button, Card, CardHeader, Empty, Input, Notice } from "@/components/ui";
import { uid } from "@/lib/utils";
import type { Photographer } from "@/types";
import type { TabProps } from "./EventWorkspace";

const ROLES = ["Photographer", "Team Leader", "Second Shooter", "Drone", "Video", "Runner"];

export default function TeamTab({ event, patch, saving }: TabProps) {
  const [team, setTeam] = useState<Photographer[]>(event.photographers);
  const [dirty, setDirty] = useState(false);
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function update(i: number, k: keyof Photographer, val: string) {
    setTeam((t) => t.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
    setDirty(true);
  }

  function addRow(acronym = "") {
    setTeam((t) => [
      ...t,
      { id: uid(), acronym: acronym.toUpperCase(), name: "", phone: "", email: "", role: "Photographer", vehicle: "", notes: "" },
    ]);
    setDirty(true);
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

    if (iAcr < 0) {
      setImportMsg({ kind: "error", text: 'No "Acronym" column found in the header row.' });
      return;
    }

    const existing = new Set(team.map((p) => p.acronym.toUpperCase()));
    const added: Photographer[] = [];
    let skipped = 0;
    for (const line of lines.slice(1)) {
      const cells = splitLine(line, sep);
      const acronym = (cells[iAcr] || "").toUpperCase();
      if (!acronym) continue;
      if (existing.has(acronym)) { skipped++; continue; }
      const name = [iFirst >= 0 ? cells[iFirst] : "", iLast >= 0 ? cells[iLast] : ""]
        .filter(Boolean)
        .join(" ")
        .trim();
      added.push({
        id: uid(),
        acronym,
        name,
        phone: iPhone >= 0 ? cells[iPhone] || "" : "",
        email: iEmail >= 0 ? cells[iEmail] || "" : "",
        role: "Photographer",
        vehicle: "",
        notes: "",
      });
      existing.add(acronym);
    }

    if (added.length) {
      setTeam((t) => [...t, ...added]);
      setDirty(true);
    }
    setImportMsg(
      added.length
        ? { kind: "ok", text: `Imported ${added.length} photographer${added.length > 1 ? "s" : ""}${skipped ? `, skipped ${skipped} duplicate acronym${skipped > 1 ? "s" : ""}` : ""}. Click Save to persist.` }
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
              {dirty && (
                <Button
                  size="sm"
                  variant="accent"
                  loading={saving}
                  onClick={() => patch({ photographers: team }).then((ok) => ok && setDirty(false))}
                >
                  Save
                </Button>
              )}
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
              className="grid items-center gap-2 rounded-md border border-slate-200 bg-slate-50/50 p-2 sm:grid-cols-[80px_1fr_130px_1fr_140px_100px_auto]"
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
              <Input value={p.vehicle} onChange={(e) => update(i, "vehicle", e.target.value)} placeholder="Vehicle" className="h-8 text-xs" />
              <button
                onClick={() => {
                  setTeam((t) => t.filter((_, j) => j !== i));
                  setDirty(true);
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
    </div>
  );
}
