"use client";

import { useEffect, useState } from "react";
import { Megaphone, Save, BookOpen, Download } from "lucide-react";
import { Button, Card, CardHeader, Empty, Textarea } from "@/components/ui";
import Markdown from "@/components/Markdown";
import type { TemplateDTO } from "@/types";
import type { TabProps } from "./EventWorkspace";

export default function BriefingTab({ event, patch, saving }: TabProps) {
  const [text, setText] = useState(event.briefing || "");
  const [dirty, setDirty] = useState(false);
  const [templates, setTemplates] = useState<TemplateDTO[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Lazy-load bookshelf only when the import picker opens
  useEffect(() => {
    if (!importOpen || templates !== null) return;
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]));
  }, [importOpen, templates]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader
          title="Event briefing"
          icon={<Megaphone size={15} className="text-blue-600" />}
          action={
            <Button size="sm" variant="outline" onClick={() => setImportOpen((v) => !v)}>
              <BookOpen size={13} /> Import from Bookshelf
            </Button>
          }
        />

        {importOpen && (
          <div className="border-b border-slate-100 px-4 py-3">
            {templates === null ? (
              <p className="text-xs text-slate-400">Loading templates…</p>
            ) : templates.length === 0 ? (
              <Empty
                icon={<BookOpen size={22} />}
                title="No templates yet"
                hint="Create briefing templates in your Bookshelf first."
              />
            ) : (
              <div className="grid gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setText(t.body);
                      setDirty(true);
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
        )}

        <div className="p-4">
          <Textarea
            rows={16}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDirty(true);
            }}
            placeholder={"# Briefing\n\n- Meet 06:00 at venue…\n- Gear checklist…"}
            className="font-mono text-xs"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Supports # headings, - bullets, **bold**, [links](url). Shown on the photographer page.
          </p>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-4 py-3">
          <Button
            size="sm"
            variant="accent"
            loading={saving}
            disabled={!dirty}
            onClick={() => patch({ briefing: text }).then((ok) => ok && setDirty(false))}
          >
            <Save size={13} /> Save briefing
          </Button>
        </div>
      </Card>

      {text.trim() && (
        <Card>
          <CardHeader title="Preview" />
          <div className="p-4">
            <Markdown text={text} />
          </div>
        </Card>
      )}
    </div>
  );
}
