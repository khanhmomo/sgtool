import Link from "next/link";
import { CalendarDays, MapPin, Flag, ArrowUpRight } from "lucide-react";
import { STATUS_META } from "@/lib/design";
import { cn } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";
import AssignTl from "@/components/AssignTl";
import type { EventDTO } from "@/types";

/** Fixed-date safe: parse YYYY-MM-DD at local noon, never UTC. */
function dateParts(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate(),
    year: d.getFullYear(),
  };
}

const AVATAR_LIMIT = 5;

export default function EventCard({
  event: e,
  dim,
  isAdmin,
}: {
  event: EventDTO;
  /** Greyed-out style for completed/archived sections */
  dim?: boolean;
  /** Show the admin "reassign TL" control */
  isAdmin?: boolean;
}) {
  const st = STATUS_META[e.status] || STATUS_META.planning;
  const start = dateParts(e.date);
  const end = e.endDate && e.endDate > e.date ? dateParts(e.endDate) : null;
  const acronyms = (e.photographers || [])
    .map((p) => (p.acronym || "").trim())
    .filter(Boolean);
  const shown = acronyms.slice(0, AVATAR_LIMIT);
  const extra = acronyms.length - shown.length;

  return (
    <Link href={`/events/${e.id}`} className="group block h-full">
      <Card
        className={cn(
          "flex h-full flex-col p-3 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-lg sm:p-4",
          dim && "opacity-70"
        )}
      >
        <div className="flex gap-2.5 sm:gap-3">
          {/* Calendar date tile */}
          {start ? (
            <div className="w-14 shrink-0 self-start overflow-hidden rounded-lg border border-slate-200 text-center shadow-sm sm:w-16">
              <div className="bg-slate-900 py-1 text-[10px] font-bold tracking-widest text-white">
                {end && end.month !== start.month ? `${start.month}–${end.month}` : start.month}
              </div>
              <div className="bg-white px-1 py-1.5 leading-none">
                <span
                  className={cn(
                    "block font-bold text-slate-900",
                    end ? "text-sm sm:text-base" : "text-lg sm:text-xl"
                  )}
                >
                  {start.day}
                  {end ? `–${end.day}` : ""}
                </span>
                <span className="mt-1 block text-[9px] font-medium tracking-wide text-slate-400">
                  {end && end.year !== start.year ? `${start.year}–${end.year}` : start.year}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-300 sm:h-16 sm:w-16">
              <CalendarDays size={18} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <Badge className={st.badge}>
                <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                {st.label}
              </Badge>
              <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {e.type}
              </span>
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
              {e.name}
            </h3>
            {e.location && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 sm:mt-1">
                <MapPin size={11} className="shrink-0" />
                {e.location}
                {e.country ? `, ${e.country}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Footer: team chips + position count */}
        <div className="mt-auto">
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:mt-3 sm:pt-3">
          <div className="flex min-w-0 items-center">
            {shown.length === 0 ? (
              <span className="text-[11px] text-slate-400">No team yet</span>
            ) : (
              <div className="flex -space-x-1.5">
                {shown.map((a, i) => (
                  <span
                    key={`${a}-${i}`}
                    title={a}
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[8px] font-bold text-slate-600 sm:h-6 sm:w-6"
                  >
                    {a.slice(0, 3)}
                  </span>
                ))}
                {extra > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[8px] font-bold text-slate-500 sm:h-6 sm:w-6">
                    +{extra}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Flag size={11} />
              {e.positions.length}
            </span>
            <ArrowUpRight
              size={15}
              className="text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600"
            />
          </div>
        </div>

        </div>

        {isAdmin && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <AssignTl eventId={e.id} ownerAcronym={e.ownerAcronym} ownerId={e.ownerId} />
          </div>
        )}
      </Card>
    </Link>
  );
}
