"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, CalendarDays, Library, FileText, MapPin, ArrowRight } from "lucide-react";
import { Badge, Card, Empty, Input } from "@/components/ui";
import { DOC_CATEGORY_META, STATUS_META } from "@/lib/design";
import { fmtDate, fmtSize } from "@/lib/utils";
import type { EventDTO, FileDTO, TemplateDTO } from "@/types";

interface Results {
  events: EventDTO[];
  templates: TemplateDTO[];
  files: FileDTO[];
  positions: { eventId: string; eventName: string; id: string; photographer: string; sport: string }[];
}

export default function SearchClient({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialQuery.trim()) return;
    run(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(query: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) setResults(data);
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.replace(`/search?q=${encodeURIComponent(q.trim())}`);
    run(q.trim());
  }

  const total =
    results && results.events.length + results.templates.length + results.files.length + results.positions.length;

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
        <Search size={22} className="text-blue-600" /> Search
      </h1>
      <form onSubmit={submit} className="mb-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events, photographers, tactics, files, positions…"
          autoFocus
          className="h-11 text-base"
        />
      </form>

      {loading && <p className="text-sm text-slate-500">Searching…</p>}

      {results && !loading && total === 0 && (
        <Empty icon={<Search size={26} />} title={`No results for "${q}"`} />
      )}

      {results && results.events.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Events</h2>
          <div className="space-y-2">
            {results.events.map((e) => {
              const st = STATUS_META[e.status];
              return (
                <Link key={e.id} href={`/events/${e.id}`}>
                  <Card className="group flex items-center gap-3 p-3 hover:shadow-md">
                    <CalendarDays size={16} className="shrink-0 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">
                        {fmtDate(e.date)} {e.location && `· ${e.location}`}
                      </p>
                    </div>
                    <Badge className={st?.badge}>{st?.label}</Badge>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {results && results.positions.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Positions</h2>
          <div className="space-y-2">
            {results.positions.map((p) => (
              <Link key={`${p.eventId}-${p.id}`} href={`/events/${p.eventId}?tab=course`}>
                <Card className="group flex items-center gap-3 p-3 hover:shadow-md">
                  <MapPin size={16} className="shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-semibold text-slate-900">{p.id}</p>
                    <p className="text-xs text-slate-500">{p.eventName} · {p.sport}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results && results.templates.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Bookshelf</h2>
          <div className="space-y-2">
            {results.templates.map((t) => (
              <Link key={t.id} href="/bookshelf">
                <Card className="group flex items-center gap-3 p-3 hover:shadow-md">
                  <Library size={16} className="shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{t.title}</p>
                    <p className="truncate text-xs text-slate-500">{t.body.slice(0, 80)}</p>
                  </div>
                  <Badge className={DOC_CATEGORY_META[t.category]?.badge}>
                    {DOC_CATEGORY_META[t.category]?.label}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results && results.files.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Files</h2>
          <div className="space-y-2">
            {results.files.map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer">
                <Card className="group flex items-center gap-3 p-3 hover:shadow-md">
                  <FileText size={16} className="shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{f.filename}</p>
                    <p className="text-xs text-slate-500">{fmtSize(f.size)} · {f.uploadedBy}</p>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
