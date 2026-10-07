import Link from "next/link";
import { Plus, CalendarDays, ArrowRight, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { STATUS_META } from "@/lib/design";
import { fmtDate } from "@/lib/utils";
import { Badge, Button, Card, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const acronym = (session.user as { acronym?: string }).acronym || "";

  await connectDB();
  const events = (await Event.find({ ownerId: session.user.id }).sort({ date: -1 }).lean()).map(
    serializeEvent
  );

  const upcoming = events.filter((e) => e.status !== "archived" && e.status !== "completed");
  const past = events.filter((e) => e.status === "archived" || e.status === "completed");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome back, {session.user.name} ({acronym})
          </p>
        </div>
        <Link href="/events/new">
          <Button variant="accent">
            <Plus size={16} /> Create Event
          </Button>
        </Link>
      </div>

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        My Events
      </h2>

      {events.length === 0 ? (
        <Empty
          icon={<CalendarDays size={28} />}
          title="No events yet"
          hint="Create your first event to start organizing venue info, photographers, positions and files."
          action={
            <Link href="/events/new">
              <Button variant="accent" size="sm">
                <Plus size={14} /> Create Event
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <EventGrid events={upcoming} />
          {past.length > 0 && (
            <>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Completed / Archived
              </h2>
              <EventGrid events={past} dim />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventGrid({ events, dim }: { events: any[]; dim?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => {
        const st = STATUS_META[e.status as keyof typeof STATUS_META] || STATUS_META.planning;
        return (
          <Link key={e.id} href={`/events/${e.id}`} className="group">
            <Card className={`h-full p-4 transition-shadow hover:shadow-md ${dim ? "opacity-70" : ""}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <Badge className={st.badge}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </Badge>
                <ArrowRight size={15} className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </div>
              <h3 className="mb-1 line-clamp-2 font-semibold text-slate-900">{e.name}</h3>
              <div className="space-y-0.5 text-xs text-slate-500">
                <p>{fmtDate(e.date)}</p>
                {e.location && (
                  <p className="flex items-center gap-1">
                    <MapPin size={11} /> {e.location}
                    {e.country ? `, ${e.country}` : ""}
                  </p>
                )}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
