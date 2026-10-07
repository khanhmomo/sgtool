"use client";

import { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Empty, Input, Notice } from "@/components/ui";
import { uid } from "@/lib/utils";
import type { Photographer } from "@/types";
import type { TabProps } from "./EventWorkspace";

const ROLES = ["Photographer", "Team Leader", "Second Shooter", "Drone", "Video", "Runner"];

export default function TeamTab({ event, patch, saving }: TabProps) {
  const [team, setTeam] = useState<Photographer[]>(event.photographers);
  const [dirty, setDirty] = useState(false);
  const [csv, setCsv] = useState("");

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

  function importCsv() {
    // Lines like: AKT,Mo Tran,+123,akt@x.com
    const rows = csv
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [acronym = "", name = "", phone = "", email = "", role = "Photographer"] = l
          .split(/[,\t]/)
          .map((s) => s.trim());
        return { id: uid(), acronym: acronym.toUpperCase(), name, phone, email, role, vehicle: "", notes: "" };
      })
      .filter((p) => p.acronym);
    if (rows.length) {
      setTeam((t) => [...t, ...rows]);
      setDirty(true);
      setCsv("");
    }
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
        <CardHeader title="Quick import" />
        <div className="space-y-2 p-4">
          <Notice kind="info">
            Paste one photographer per line: <code>ACRONYM, Name, Phone, Email, Role</code>
          </Notice>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={3}
            placeholder={"GIP, Giang Pham, +84 9xx, gip@x.com\nMAT, Mateo, +1 555, mat@x.com"}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <Button size="sm" variant="outline" onClick={importCsv} disabled={!csv.trim()}>
            Import
          </Button>
        </div>
      </Card>
    </div>
  );
}
