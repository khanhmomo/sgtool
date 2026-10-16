"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Library,
  Plus,
  Search,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  X,
  Save,
} from "lucide-react";
import {
  Button,
  Card,
  Empty,
  Field,
  Input,
  Notice,
  Select,
  Textarea,
} from "@/components/ui";
import { DOC_CATEGORY_META } from "@/lib/design";
import { fmtDate, uid } from "@/lib/utils";
import { parseChecklist, serializeChecklist } from "@/lib/checklist";
import Markdown from "@/components/Markdown";
import type { ChecklistGroup, TemplateDTO } from "@/types";

type EditingTpl = TemplateDTO & { __isNew?: boolean };

export default function BookshelfClient({
  templates: initial,
  initialQuery,
}: {
  templates: TemplateDTO[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateDTO[]>(initial);
  const [editing, setEditing] = useState<EditingTpl | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState(initialQuery);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkGroups, setCheckGroups] = useState<ChecklistGroup[] | null>(null);
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [newGroup, setNewGroup] = useState("");

  /** When switching TO Checklist, parse body → groups; switching away serializes back. */
  function changeCategory(c: TemplateDTO["category"]) {
    if (!editing) return;
    if (c === "checklist") {
      setCheckGroups(checkGroups ?? parseChecklist(editing.body));
    } else if (checkGroups) {
      setEditing({ ...editing, category: c, body: serializeChecklist(checkGroups) });
      setCheckGroups(null);
      return;
    }
    setEditing({ ...editing, category: c });
  }

  function setGroupTitle(gi: number, title: string) {
    setCheckGroups((gs) => gs?.map((g, i) => (i === gi ? { ...g, title } : g)) ?? null);
  }
  function setItemText(gi: number, ii: number, text: string) {
    setCheckGroups(
      (gs) =>
        gs?.map((g, i) =>
          i === gi ? { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, text } : it)) } : g
        ) ?? null
    );
  }
  function removeGroup(gi: number) {
    setCheckGroups((gs) => gs?.filter((_, i) => i !== gi) ?? null);
  }
  function removeItem(gi: number, ii: number) {
    setCheckGroups(
      (gs) =>
        gs?.map((g, i) =>
          i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g
        ) ?? null
    );
  }
  function addItem(gi: number) {
    if (!checkGroups) return;
    const g = checkGroups[gi];
    const text = (newItem[g.id] || "").trim();
    if (!text) return;
    setCheckGroups(
      (gs) =>
        // Dedupe: React 19 StrictMode double-invokes event handlers in dev —
        // a second call must be a no-op or items get duplicated.
        gs?.map((x, i) =>
          i === gi && !x.items.some((it) => it.text === text)
            ? { ...x, items: [...x.items, { id: uid(), text, done: false }] }
            : x
        ) ?? null
    );
    setNewItem((s) => ({ ...s, [g.id]: "" }));
  }
  function addGroup() {
    const title = newGroup.trim().toUpperCase();
    if (!title) return;
    setCheckGroups((gs) => {
      if (gs?.some((g) => g.title === title)) return gs ?? null; // StrictMode double-invoke guard
      return [...(gs ?? []), { id: uid(), title, items: [] }];
    });
    setNewGroup("");
  }

  const visible = templates.filter((t) => {
    if (!showArchived && t.archived) return false;
    if (q) {
      const s = q.toLowerCase();
      return t.title.toLowerCase().includes(s) || t.body.toLowerCase().includes(s);
    }
    return true;
  });

  async function refresh() {
    const res = await fetch(`/api/templates?archived=1`);
    const data = await res.json();
    if (res.ok) setTemplates(data.templates);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: editing.title,
        category: editing.category,
        body: editing.category === "checklist" && checkGroups
          ? serializeChecklist(checkGroups)
          : editing.body,
      };
      const res = editing.__isNew
        ? await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/templates/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      setEditing(null);
      await refresh();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function patchTpl(id: string, fields: Record<string, unknown>) {
    const res = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates((ts) => ts.map((t) => (t.id === id ? data.template : t)));
    }
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/templates/${id}/copy`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setTemplates((ts) => [data.template, ...ts]);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template permanently?")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates((ts) => ts.filter((t) => t.id !== id));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <Library size={22} className="text-blue-600" /> Bookshelf
          </h1>
          <p className="text-sm text-slate-500">
            Reusable tactics, guides and checklists — add them to any event.
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() =>
            setEditing({
              id: "",
              ownerId: "",
              title: "",
              category: "other",
              tags: [],
              body: "",
              archived: false,
              createdAt: "",
              updatedAt: "",
              __isNew: true,
            })
          }
        >
          <Plus size={16} /> New template
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates…"
            className="h-9 w-56 pl-8"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-blue-600"
          />
          Show archived
        </label>
      </div>

      {visible.length === 0 ? (
        <Empty
          icon={<Library size={28} />}
          title="Your Bookshelf is empty"
          hint="Create tactics, checklists and guides once — then add them to any event with one click."
          action={
            <Button
              size="sm"
              variant="accent"
              onClick={() =>
                setEditing({
                  id: "", ownerId: "", title: "", category: "tactic", tags: [],
                  body: "", archived: false, createdAt: "", updatedAt: "", __isNew: true,
                })
              }
            >
              <Plus size={14} /> New template
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {(Object.keys(DOC_CATEGORY_META) as (keyof typeof DOC_CATEGORY_META)[])
            .map((cat) => ({
              cat,
              items: visible.filter((t) => t.category === cat),
            }))
            .filter((s) => s.items.length > 0)
            .map((s) => (
              <section key={s.cat}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DOC_CATEGORY_META[s.cat].badge}`}
                  >
                    {DOC_CATEGORY_META[s.cat].label}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {s.items.length} {s.items.length === 1 ? "template" : "templates"}
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {s.items.map((t) => (
            <Card key={t.id} className={t.archived ? "opacity-60" : ""}>
              {t.archived && (
                <div className="px-4 pt-3">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    ARCHIVED
                  </span>
                </div>
              )}
              <button
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="block w-full px-4 pb-2 pt-1 text-left"
              >
                <h3 className="font-semibold text-slate-900">{t.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                  {t.body.replace(/[#*\-[\]]/g, "").trim().slice(0, 140) || "Empty template"}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">Updated {fmtDate(t.updatedAt)}</p>
              </button>
              {expanded === t.id && (
                <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-4 py-3">
                  <Markdown text={t.body} />
                </div>
              )}
              <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2">
                <button onClick={() => setEditing({ ...t })} title="Edit" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Pencil size={14} />
                </button>
                <button onClick={() => duplicate(t.id)} title="Duplicate" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => patchTpl(t.id, { archived: !t.archived })}
                  title={t.archived ? "Restore" : "Archive"}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {t.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                </button>
                <button onClick={() => remove(t.id)} title="Delete" className="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {editing.__isNew ? "New template" : "Edit template"}
              </h3>
              <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-4 p-4">
              <Field label="Title">
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Race-day briefing"
                />
              </Field>
              <Field label="Category">
                <Select
                  value={editing.category}
                  onChange={(e) => changeCategory(e.target.value as TemplateDTO["category"])}
                >
                  {(Object.keys(DOC_CATEGORY_META) as (keyof typeof DOC_CATEGORY_META)[]).map((c) => (
                    <option key={c} value={c}>
                      {DOC_CATEGORY_META[c].label}
                    </option>
                  ))}
                </Select>
              </Field>
              {editing.category === "checklist" && checkGroups ? (
                <Field
                  label="Checklist"
                  hint="Groups become checklist sections; each line is an item. Saved as markdown internally."
                >
                  <div className="space-y-3">
                    {checkGroups.map((g, gi) => (
                      <div key={g.id} className="rounded-md border border-slate-200">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-2 py-1.5">
                          <Input
                            value={g.title}
                            onChange={(e) => setGroupTitle(gi, e.target.value)}
                            placeholder="GROUP TITLE"
                            className="h-7 flex-1 text-xs font-bold uppercase"
                          />
                          <button
                            onClick={() => removeGroup(gi)}
                            className="rounded p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="space-y-1.5 px-2 py-2">
                          {g.items.map((it, ii) => (
                            <div key={it.id} className="flex items-center gap-2">
                              <Input
                                value={it.text}
                                onChange={(e) => setItemText(gi, ii, e.target.value)}
                                placeholder="Item…"
                                className="h-7 flex-1 text-xs"
                              />
                              <button
                                onClick={() => removeItem(gi, ii)}
                                className="rounded p-1 text-slate-300 hover:text-red-600"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <Input
                              value={newItem[g.id] || ""}
                              onChange={(e) =>
                                setNewItem((s) => ({ ...s, [g.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addItem(gi);
                                }
                              }}
                              placeholder="Add item…"
                              className="h-7 flex-1 text-xs"
                            />
                            <Button size="xs" variant="ghost" onClick={() => addItem(gi)}>
                              <Plus size={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newGroup}
                        onChange={(e) => setNewGroup(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addGroup();
                          }
                        }}
                        placeholder="New group (e.g. PRE-EVENT)"
                        className="h-8 flex-1 text-xs"
                      />
                      <Button size="xs" variant="outline" onClick={addGroup} disabled={!newGroup.trim()}>
                        <Plus size={12} /> Add group
                      </Button>
                    </div>
                  </div>
                </Field>
              ) : (
                <Field
                  label="Content"
                  hint="Supports # headings, - bullets, **bold**, [links](url). Switch to Checklist for a group/item editor."
                >
                  <Textarea
                    rows={14}
                    value={editing.body}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    className="font-mono text-xs"
                  />
                </Field>
              )}
              {error && <Notice kind="error">{error}</Notice>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button variant="accent" loading={saving} onClick={save} disabled={!editing.title.trim()}>
                  <Save size={13} /> Save template
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
