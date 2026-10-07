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
  Badge,
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
import { fmtDate } from "@/lib/utils";
import Markdown from "@/components/Markdown";
import type { TemplateDTO } from "@/types";

const CATS = ["tactic", "guide", "checklist", "note", "strategy", "other"] as const;

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
  const [catFilter, setCatFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visible = templates.filter((t) => {
    if (!showArchived && t.archived) return false;
    if (catFilter && t.category !== catFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      return (
        t.title.toLowerCase().includes(s) ||
        t.body.toLowerCase().includes(s) ||
        t.tags.some((tag) => tag.toLowerCase().includes(s))
      );
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
        tags: editing.tags,
        body: editing.body,
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
              category: "tactic",
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
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-44">
          <option value="">All categories</option>
          {CATS.map((c) => (
            <option key={c} value={c}>
              {DOC_CATEGORY_META[c].label}
            </option>
          ))}
        </Select>
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
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((t) => (
            <Card key={t.id} className={t.archived ? "opacity-60" : ""}>
              <div className="flex items-center gap-2 px-4 pt-3">
                <Badge className={DOC_CATEGORY_META[t.category]?.badge}>
                  {DOC_CATEGORY_META[t.category]?.label}
                </Badge>
                {t.tags.map((tag) => (
                  <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    {tag}
                  </span>
                ))}
                {t.archived && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    ARCHIVED
                  </span>
                )}
              </div>
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
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Field label="Title">
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="IRONMAN Bike Position Guide"
                  />
                </Field>
                <Field label="Category">
                  <Select
                    value={editing.category}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value as EditingTpl["category"] })
                    }
                  >
                    {CATS.map((c) => (
                      <option key={c} value={c}>
                        {DOC_CATEGORY_META[c].label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Tags" hint="Comma separated, e.g. ironman, bike, night">
                <Input
                  value={editing.tags.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field
                label="Content"
                hint="Supports # headings, - bullets, **bold**, [links](url). Checklist templates: one item per line."
              >
                <Textarea
                  rows={14}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  className="font-mono text-xs"
                />
              </Field>
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
