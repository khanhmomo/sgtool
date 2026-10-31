"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckSquare, Copy, Download, Plus, Trash2, X } from "lucide-react";
import { Button, Card, CardHeader, Empty, Input } from "@/components/ui";
import { cn, dateRangeYmd, fmtDate, uid } from "@/lib/utils";
import type { ChecklistGroup, KwDayChecklist, TemplateDTO } from "@/types";
import { parseChecklist } from "@/lib/checklist";
import type { TabProps } from "./EventWorkspace";

/** Fixed KW checklist items — order is the copy-out order */
const KW_ITEMS = ["Best of", "GPX/Spotinfo", "Picture count", "InfoFile", "Resize", "Upload"];

export default function ChecklistTab({ event, patch }: TabProps) {
  const [groups, setGroups] = useState<ChecklistGroup[]>(event.checklist);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [newGroup, setNewGroup] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateDTO[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // ── KW Group Checklist — one block per event date ─────────────────────────
  const [kwDays, setKwDays] = useState<KwDayChecklist[]>(() => {
    const dates = dateRangeYmd(event.date, event.endDate || "");
    const list = dates.length ? dates : [event.date || ""];
    const saved = event.kwChecklist || [];
    return list.map((date) => {
      const s = saved.find((d) => d.date === date);
      return {
        date,
        eventId: s?.eventId || "",
        laptopId: s?.laptopId || "",
        checks: KW_ITEMS.map((label) => ({
          label,
          done: !!s?.checks?.find((c) => c.label === label)?.done,
        })).concat((s?.checks || []).filter((c) => !KW_ITEMS.includes(c.label))),
      };
    });
  });
  const [kwDate, setKwDate] = useState(() => kwDays[0]?.date ?? "");
  const kwDay = kwDays.find((d) => d.date === kwDate) ?? kwDays[0];

  const saveKw = (next: KwDayChecklist[]) => {
    setKwDays(next);
    patch({ kwChecklist: next.filter((d) => d.eventId || d.laptopId || d.checks.some((c) => c.done)) });
  };

  const setKwField = (date: string, key: "eventId" | "laptopId", value: string) =>
    setKwDays((ds) => ds.map((d) => (d.date === date ? { ...d, [key]: value } : d)));

  const toggleKw = (date: string, label: string) =>
    saveKw(
      kwDays.map((d) =>
        d.date === date
          ? { ...d, checks: d.checks.map((c) => (c.label === label ? { ...c, done: !c.done } : c)) }
          : d
      )
    );

  const kwStatusText = (d: KwDayChecklist) =>
    [
      `Event ${d.eventId}`,
      `Laptop ${d.laptopId}`,
      ...d.checks.map((c) => `${c.label} ${c.done ? "✅" : "⚙️"}`),
    ].join("\n");

  const copyStatus = async (d: KwDayChecklist) => {
    try {
      await navigator.clipboard.writeText(kwStatusText(d));
      setCopied(d.date);
      setTimeout(() => setCopied((c) => (c === d.date ? null : c)), 1500);
    } catch {
      // clipboard unavailable (non-secure context) — no-op
    }
  };

  useEffect(() => {
    if (!importOpen || templates !== null) return;
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]));
  }, [importOpen, templates]);

  const checklistTemplates =
    templates?.filter((t) => t.category === "checklist") || [];
  const shownTemplates = checklistTemplates.length ? checklistTemplates : templates || [];

  async function save(next: ChecklistGroup[]) {
    setGroups(next);
    await patch({ checklist: next });
  }

  function toggle(gi: number, ii: number) {
    const next = groups.map((g, gi2) =>
      gi2 === gi
        ? { ...g, items: g.items.map((it, ii2) => (ii2 === ii ? { ...it, done: !it.done } : it)) }
        : g
    );
    save(next);
  }

  function addItem(gi: number) {
    const text = (newItemText[groups[gi].id] || "").trim();
    if (!text) return;
    // Dedupe: React 19 StrictMode double-invokes event handlers in dev —
    // a second call must be a no-op or items get duplicated.
    if (groups[gi].items.some((it) => it.text === text)) {
      setNewItemText((s) => ({ ...s, [groups[gi].id]: "" }));
      return;
    }
    const next = groups.map((g, gi2) =>
      gi2 === gi ? { ...g, items: [...g.items, { id: uid(), text, done: false }] } : g
    );
    setNewItemText((s) => ({ ...s, [groups[gi].id]: "" }));
    save(next);
  }

  function addGroup() {
    const title = newGroup.trim();
    if (!title) return;
    setNewGroup("");
    save([...groups, { id: uid(), title: title.toUpperCase(), items: [] }]);
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => i.done).length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">
            {done}/{total} done
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setImportOpen((v) => !v)}>
          <BookOpen size={13} /> Import from Bookshelf
        </Button>
      </div>

      {importOpen && (
        <Card>
          <div className="p-3">
            {templates === null ? (
              <p className="px-1 py-2 text-xs text-slate-400">Loading templates…</p>
            ) : shownTemplates.length === 0 ? (
              <Empty
                icon={<BookOpen size={22} />}
                title="No checklist templates yet"
                hint="Create a template with the 'Checklist' category in your Bookshelf."
              />
            ) : (
              <div className="grid gap-1.5">
                {shownTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const parsed = parseChecklist(t.body);
                      if (parsed.length) save([...groups, ...parsed]);
                      setImportOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    <Download size={13} className="shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{t.title}</span>
                      <span className="block truncate text-xs text-slate-400">
                        {t.body.replace(/[#*\-[\]]/g, "").trim().slice(0, 80)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {groups.length === 0 && (
        <Empty
          icon={<CheckSquare size={26} />}
          title="No checklist yet"
          hint="Create groups like PRE-EVENT / RACE DAY / POST-EVENT, or add a checklist template from your Bookshelf in Tactics & Docs."
        />
      )}

      {groups.map((g, gi) => (
        <Card key={g.id}>
          <CardHeader
            title={g.title}
            icon={<CheckSquare size={15} className="text-blue-600" />}
            action={
              <button
                onClick={() => save(groups.filter((_, j) => j !== gi))}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            }
          />
          <div className="divide-y divide-slate-100">
            {g.items.map((it, ii) => (
              <div key={it.id} className="group flex items-center gap-3 px-4 py-2.5">
                <button
                  onClick={() => toggle(gi, ii)}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    it.done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white hover:border-blue-400"
                  )}
                >
                  {it.done && <X size={0} className="hidden" />}
                  {it.done && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current stroke-2">
                      <path d="M2 6.5 5 9.5 10 2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    it.done ? "text-slate-400 line-through" : "text-slate-800"
                  )}
                >
                  {it.text}
                </span>
                <button
                  onClick={() =>
                    save(
                      groups.map((g2, gi2) =>
                        gi2 === gi ? { ...g2, items: g2.items.filter((_, j) => j !== ii) } : g2
                      )
                    )
                  }
                  className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Input
                value={newItemText[g.id] || ""}
                onChange={(e) => setNewItemText((s) => ({ ...s, [g.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addItem(gi)}
                placeholder="Add item…"
                className="h-8 text-xs"
              />
              <Button size="sm" variant="ghost" onClick={() => addItem(gi)}>
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <div className="flex items-center gap-2 p-3">
          <Input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGroup()}
            placeholder="New checklist group (e.g. PRE-EVENT)"
            className="h-9 text-sm"
          />
          <Button size="sm" variant="outline" onClick={addGroup} disabled={!newGroup.trim()}>
            <Plus size={14} /> Add group
          </Button>
        </div>
      </Card>

      {/* ── KW Group Checklist — day picker + one block per active date ────── */}
      {kwDay && (
        <div className="pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            KW Group Checklist
          </p>
          {kwDays.length > 1 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {kwDays.map((d) => (
                <button
                  key={d.date || "day"}
                  onClick={() => setKwDate(d.date)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    d.date === kwDay.date
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {d.date ? fmtDate(d.date) : "Unscheduled"}
                </button>
              ))}
            </div>
          )}
          <Card>
            <CardHeader
              title={kwDay.date ? fmtDate(kwDay.date) : "Event day"}
              icon={<CheckSquare size={15} className="text-blue-600" />}
            />
            <div className="space-y-2.5 px-4 pb-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-2">
                  <span className="w-12 text-xs font-semibold text-slate-500">Event</span>
                  <Input
                    value={kwDay.eventId}
                    onChange={(e) => setKwField(kwDay.date, "eventId", e.target.value)}
                    onBlur={() => saveKw(kwDays)}
                    placeholder="Event ID"
                    className="h-9 w-40 text-xs"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-12 text-xs font-semibold text-slate-500">Laptop</span>
                  <Input
                    value={kwDay.laptopId}
                    onChange={(e) => setKwField(kwDay.date, "laptopId", e.target.value)}
                    onBlur={() => saveKw(kwDays)}
                    placeholder="Laptop ID"
                    className="h-9 w-40 text-xs"
                  />
                </label>
              </div>
              <div className="divide-y divide-slate-100">
                {kwDay.checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-3 py-1.5">
                    <button
                      onClick={() => toggleKw(kwDay.date, c.label)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        c.done
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-white hover:border-blue-400"
                      )}
                    >
                      {c.done && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current stroke-2">
                          <path d="M2 6.5 5 9.5 10 2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        c.done ? "text-slate-400 line-through" : "text-slate-800"
                      )}
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => copyStatus(kwDay)}>
                <Copy size={13} /> {copied === kwDay.date ? "Copied!" : "Copy Status"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
