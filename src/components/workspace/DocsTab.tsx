"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, BookOpen, Save, Pencil, X } from "lucide-react";
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
  Textarea,
} from "@/components/ui";
import { DOC_CATEGORY_META } from "@/lib/design";
import { uid } from "@/lib/utils";
import Markdown from "@/components/Markdown";
import type { DocCategory, EventDoc, TemplateDTO } from "@/types";
import type { TabProps } from "./EventWorkspace";

const DOC_CATS: DocCategory[] = ["tactic", "guide", "checklist", "note", "other"];

type EditingDoc = EventDoc & { __isNew?: boolean };

export default function DocsTab({ event, patch, saving }: TabProps) {
  const [docs, setDocs] = useState<EventDoc[]>(event.documents);
  const [notes, setNotes] = useState(event.notes);
  const [editing, setEditing] = useState<EditingDoc | null>(null);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  async function saveDocs(next: EventDoc[]) {
    const ok = await patch({ documents: next });
    if (ok) setDocs(next);
  }

  function stripTmp(d: EditingDoc): EventDoc {
    const { __isNew: _drop, ...rest } = d;
    void _drop;
    return { ...rest, updatedAt: new Date().toISOString() };
  }

  async function saveDoc() {
    if (!editing) return;
    const clean = stripTmp(editing);
    const next = editing.__isNew
      ? [...docs, clean]
      : docs.map((d) => (d.id === editing.id ? clean : d));
    await saveDocs(next);
    setEditing(null);
  }

  async function addTemplate(tplId: string) {
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${event.id}/add-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: tplId }),
      });
      const data = await res.json();
      if (res.ok) {
        setDocs(data.event.documents);
        setMsg("Template copied into this event.");
        setAddOpen(false);
        setTimeout(() => setMsg(""), 3000);
      } else {
        setMsg(data.error || "Failed to add template.");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader
          title="Tactics, guides & notes"
          icon={<FileText size={15} className="text-blue-600" />}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddOpen((o) => !o)}>
                <BookOpen size={14} /> From Bookshelf
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditing({
                    id: uid(),
                    title: "",
                    category: "tactic",
                    body: "",
                    updatedAt: new Date().toISOString(),
                    __isNew: true,
                  })
                }
              >
                <Plus size={14} /> New document
              </Button>
            </div>
          }
        />
        <div className="space-y-3 p-4">
          {msg && <Notice kind={msg.startsWith("Template") ? "ok" : "error"}>{msg}</Notice>}
          {addOpen && (
            <div className="rounded-md border border-blue-200 bg-blue-50/50 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                Add template to event (creates a copy)
              </p>
              {templates.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Your Bookshelf is empty.{" "}
                  <a href="/bookshelf" className="font-medium text-blue-600 underline">
                    Create a template
                  </a>
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => addTemplate(t.id)}
                      disabled={adding}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2.5 text-left text-sm hover:border-blue-300 hover:shadow-sm disabled:opacity-50"
                    >
                      <Badge className={DOC_CATEGORY_META[t.category]?.badge}>
                        {DOC_CATEGORY_META[t.category]?.label}
                      </Badge>
                      <span className="min-w-0 truncate font-medium text-slate-800">{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {docs.length === 0 && !addOpen && (
            <Empty
              icon={<FileText size={26} />}
              title="No documents yet"
              hint="Add tactics, guides or notes — or pull one in from your Bookshelf."
            />
          )}

          {docs.map((d) => (
            <div key={d.id} className="rounded-md border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <Badge className={DOC_CATEGORY_META[d.category]?.badge}>
                  {DOC_CATEGORY_META[d.category]?.label}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                  {d.title}
                </span>
                {d.sourceTemplateId && (
                  <span className="text-[10px] text-slate-400">from Bookshelf</span>
                )}
                <button
                  onClick={() => setEditing({ ...d })}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => saveDocs(docs.filter((x) => x.id !== d.id))}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="px-3 py-2">
                <Markdown text={d.body} />
              </div>
            </div>
          ))}
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

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader
              title={editing.__isNew ? "New document" : "Edit document"}
              action={
                <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                  <X size={16} />
                </button>
              }
            />
            <div className="grid gap-4 p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Field label="Title">
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="Bike tactic"
                  />
                </Field>
                <Field label="Category">
                  <Select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value as DocCategory })}
                  >
                    {DOC_CATS.map((c) => (
                      <option key={c} value={c}>
                        {DOC_CATEGORY_META[c].label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Content" hint="Supports # headings, - bullets, **bold**, [links](url)">
                <Textarea
                  rows={12}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  className="font-mono text-xs"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button variant="accent" loading={saving} onClick={saveDoc} disabled={!editing.title.trim()}>
                  <Save size={13} /> Save document
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
