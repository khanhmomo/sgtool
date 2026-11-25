import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Event, User } from "@/lib/models";
import { serializeEvent, serializeUser } from "@/lib/serialize";
import { Button, Empty } from "@/components/ui";
import EventCard from "@/components/EventCard";
import EventsFilter from "@/components/EventsFilter";
import type { EventStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function EventsPage(props: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; tl?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { q = "", status = "", sort = "desc", tl = "" } = await props.searchParams;

  await connectDB();
  const isAdmin = (session.user as { role?: string }).role === "admin";

  // Base scope: ownership (+ admin TL filter). Status is applied separately so
  // pill counts can reflect every status for the same scope/search.
  const scopeAnd: Record<string, unknown>[] = [];
  if (!isAdmin) {
    scopeAnd.push({ $or: [{ ownerId: session.user.id }, { teamLeaders: session.user.id }] });
  } else if (tl) {
    scopeAnd.push({ ownerId: tl });
  }
  const scope: Record<string, unknown> = scopeAnd.length ? { $and: scopeAnd } : {};

  const qClause = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { location: { $regex: q, $options: "i" } },
          { type: { $regex: q, $options: "i" } },
        ],
      }
    : null;

  const countFilter: Record<string, unknown> = { ...scope };
  if (qClause) countFilter.$and = [...(countFilter.$and as unknown[] || []), qClause];

  const filter: Record<string, unknown> = { ...countFilter };
  if (status) filter.status = status;

  // Admin-only: TL list for the "filter by team leader" select
  const tls = isAdmin
    ? (await User.find({ role: "team_leader", active: true }).sort({ name: 1 }).lean()).map(
        serializeUser
      )
    : [];

  const [events, statusRows] = await Promise.all([
    Event.find(filter)
      .sort({ date: sort === "asc" ? 1 : -1 })
      .lean(),
    Event.aggregate<{ _id: EventStatus; n: number }>([
      { $match: countFilter },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
  ]);

  const dto = events.map(serializeEvent);
  const counts: Partial<Record<EventStatus, number>> = {};
  let total = 0;
  for (const r of statusRows) {
    counts[r._id] = r.n;
    total += r.n;
  }

  const upcoming = dto.filter((e) => e.status !== "archived" && e.status !== "completed");
  const past = dto.filter((e) => e.status === "archived" || e.status === "completed");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Events</h1>
          <p className="text-sm text-slate-500">
            {dto.length} event{dto.length === 1 ? "" : "s"}
            {status || q ? " matching filters" : ""}
          </p>
        </div>
        <Link href="/events/new">
          <Button variant="accent">
            <Plus size={16} /> Create Event
          </Button>
        </Link>
      </div>

      <EventsFilter q={q} status={status} sort={sort} tl={tl} tls={tls} counts={counts} total={total} />

      {dto.length === 0 ? (
        <Empty
          icon={<CalendarDays size={28} />}
          title={q || status ? "No events match your filters" : "No events yet"}
          hint={q || status ? "Try a different search or clear the status filter." : undefined}
          action={
            <Link href="/events/new">
              <Button variant="accent" size="sm">
                <Plus size={14} /> Create Event
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-baseline gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Upcoming
                <span className="font-medium normal-case text-slate-400">{upcoming.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} isAdmin={isAdmin} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-baseline gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Completed / Archived
                <span className="font-medium normal-case text-slate-400">{past.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((e) => (
                  <EventCard key={e.id} event={e} dim isAdmin={isAdmin} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
