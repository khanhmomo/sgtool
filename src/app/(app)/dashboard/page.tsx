import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { Button, Empty } from "@/components/ui";
import EventCard from "@/components/EventCard";
import type { EventDTO } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const acronym = (session.user as { acronym?: string }).acronym || "";

  await connectDB();
  const events = (await Event.find({ $or: [{ ownerId: session.user.id }, { teamLeaders: session.user.id }] }).sort({ date: -1 }).lean()).map(
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

function EventGrid({ events, dim }: { events: EventDTO[]; dim?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} dim={dim} />
      ))}
    </div>
  );
}
