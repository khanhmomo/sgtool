import Link from "next/link";
import { Plus, CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { STATUS_META } from "@/lib/design";
import { fmtDate } from "@/lib/utils";
import { Badge, Button, Card, Empty } from "@/components/ui";
import EventsFilter from "@/components/EventsFilter";
import AssignTl from "@/components/AssignTl";

export const dynamic = "force-dynamic";

export default async function EventsPage(props: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { q = "", status = "", sort = "desc" } = await props.searchParams;

  await connectDB();
  const isAdmin = (session.user as { role?: string }).role === "admin";
  const filter: Record<string, unknown> = isAdmin ? {} : { ownerId: session.user.id };
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
      { type: { $regex: q, $options: "i" } },
    ];
  }
  const events = (
    await Event.find(filter)
      .sort({ date: sort === "asc" ? 1 : -1 })
      .lean()
  ).map(serializeEvent);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Events</h1>
          <p className="text-sm text-slate-500">{events.length} event{events.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/events/new">
          <Button variant="accent">
            <Plus size={16} /> Create Event
          </Button>
        </Link>
      </div>

      <EventsFilter q={q} status={status} sort={sort} />

      {events.length === 0 ? (
        <Empty
          icon={<CalendarDays size={28} />}
          title={q || status ? "No events match your filters" : "No events yet"}
          action={
            <Link href="/events/new">
              <Button variant="accent" size="sm">
                <Plus size={14} /> Create Event
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {events.map((e) => {
            const st = STATUS_META[e.status] || STATUS_META.planning;
            return (
              <Link key={e.id} href={`/events/${e.id}`}>
                <Card className="group flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
                  <div className={`h-10 w-1.5 shrink-0 rounded-full ${st.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900">{e.name}</h3>
                      <Badge className={st.badge}>{st.label}</Badge>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{e.type}</span>
                      <span>{fmtDate(e.date)}</span>
                      {e.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {e.location}
                        </span>
                      )}
                      <span>{e.photographers.length} photographers</span>
                      <span>{e.positions.length} positions</span>
                    </p>
                    {isAdmin && (
                      <AssignTl eventId={e.id} ownerAcronym={e.ownerAcronym} ownerId={e.ownerId} />
                    )}
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-slate-300 group-hover:text-slate-500" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
