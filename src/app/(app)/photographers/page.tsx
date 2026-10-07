import Link from "next/link";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { Card, Empty } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { Photographer } from "@/types";

export const dynamic = "force-dynamic";

export default async function PhotographersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const events = await Event.find({ ownerId: session.user.id })
    .select("name date photographers")
    .sort({ date: -1 })
    .lean();

  // Aggregate photographers across events
  const map = new Map<string, { p: Photographer; events: { id: string; name: string; date: string }[] }>();
  for (const ev of events) {
    for (const p of (ev.photographers || []) as Photographer[]) {
      const key = p.acronym || p.name;
      if (!key) continue;
      const entry = map.get(key) || { p, events: [] };
      entry.events.push({ id: String(ev._id), name: ev.name, date: ev.date });
      map.set(key, entry);
    }
  }
  const roster = [...map.values()].sort((a, b) => a.p.acronym.localeCompare(b.p.acronym));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
        <Users size={22} className="text-blue-600" /> Photographers
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Aggregated roster across your events ({roster.length} people)
      </p>

      {roster.length === 0 ? (
        <Empty
          icon={<Users size={28} />}
          title="No photographers yet"
          hint="Add photographers inside an event's Team tab — they'll show up here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {roster.map(({ p, events }) => (
            <Card key={p.acronym} className="p-4">
              <div className="mb-2 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {p.acronym}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{p.name || p.acronym}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.role}
                    {p.phone ? ` · ${p.phone}` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                {events.map((e) => (
                  <Link key={e.id} href={`/events/${e.id}`} className="block">
                    <p className="truncate text-xs text-blue-600 hover:underline">
                      {e.name} <span className="text-slate-400">· {fmtDate(e.date)}</span>
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
