import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, User } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent } from "@/lib/serialize";
import { deleteEventFiles } from "@/lib/files";

// Whitelisted top-level fields that PATCH may update.
const PATCHABLE = new Set([
  "name", "type", "date", "endDate", "location", "country", "organizer", "website",
  "status", "venue", "hotels", "transport", "schedule", "contacts", "photographers",
  "positions", "preSpots", "tactic", "tacticPublished", "tacticDays", "tacticManaged", "course", "documents", "checklist", "notes",
  "teamLeaders",
  "hyrox", "briefing", "requests",
]);

type Ctx = { params: Promise<{ id: string }> };

/** Merge a per-day list so a stale client only overwrites the days it actually
    edited. `changed` = day keys the client modified, `baseKeys` = keys it knew
    about. Unchanged stale copies keep the server's fresh version; days deleted
    by the client (in baseKeys, absent from incoming) are removed; days added by
    someone else (not in baseKeys) are preserved. */
function mergeDayList<T extends Record<string, unknown>>(
  current: T[],
  incoming: T[],
  changed: Set<string>,
  baseKeys: Set<string>,
  key: (d: T) => string
): T[] {
  const curKeys = new Set(current.map(key));
  const inKeys = new Set(incoming.map(key));
  const merged: T[] = [];
  for (const d of current) {
    const k = key(d);
    if (changed.has(k)) {
      const rep = incoming.find((x) => key(x) === k);
      if (rep) merged.push(rep);
    } else if (inKeys.has(k) || !baseKeys.has(k)) merged.push(d);
  }
  for (const d of incoming) if (!curKeys.has(key(d))) merged.push(d);
  return merged;
}

async function ownedEvent(id: string, user: { id: string; role?: string }) {
  await connectDB();
  const filter: Record<string, unknown> = { _id: id };
  if (user.role !== "admin") {
    // creator or any added team leader gets full access
    filter.$or = [{ ownerId: user.id }, { teamLeaders: user.id }];
  }
  return Event.findOne(filter);
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const event = await ownedEvent(id, user);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: serializeEvent(event) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const event = await ownedEvent(id, user);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // bestofUrl: resolve sportograf best-of link into image URLs (empty string clears)
  if (body.bestofUrl !== undefined) {
    const { fetchBestof } = await import("@/lib/bestof");
    event.bestof = body.bestofUrl ? await fetchBestof(String(body.bestofUrl)) : null;
    event.markModified("bestof");
  }

  // Ownership transfer: owner or admin may reassign the event to another Team Leader
  if (body.ownerId !== undefined) {
    const isOwner = String(event.ownerId) === String(user.id);
    if (user.role !== "admin" && !isOwner) {
      return NextResponse.json({ error: "Only the owner or an admin can transfer event ownership." }, { status: 403 });
    }
    const tl = await User.findById(String(body.ownerId));
    if (!tl || tl.active === false) {
      return NextResponse.json({ error: "Target Team Leader not found." }, { status: 404 });
    }
    event.ownerId = tl._id;
    event.ownerAcronym = tl.acronym || "";
  }

  // Per-day merged fields — a stale editor only clobbers days it edited
  const tacticDayKey = (d: Record<string, unknown>) =>
    (d.label ? `|${d.label}` : `${d.date || ""}|`);
  if (Array.isArray(body.tacticDays) && Array.isArray(body.tacticDayChanged)) {
    event.tacticDays = mergeDayList(
      (event.tacticDays || []) as Record<string, unknown>[],
      body.tacticDays as Record<string, unknown>[],
      new Set(body.tacticDayChanged as string[]),
      new Set((body.tacticDayBaseKeys || []) as string[]),
      tacticDayKey
    ) as never;
    event.markModified("tacticDays");
    delete body.tacticDays;
  }
  if (Array.isArray(body.hyrox) && Array.isArray(body.hyroxChanged)) {
    event.hyrox = mergeDayList(
      (event.hyrox || []) as Record<string, unknown>[],
      body.hyrox as Record<string, unknown>[],
      new Set(body.hyroxChanged as string[]),
      new Set((body.hyroxBaseKeys || []) as string[]),
      (d) => String(d.date || "")
    ) as never;
    event.markModified("hyrox");
    delete body.hyrox;
  }

  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE.has(k)) {
      (event as unknown as Record<string, unknown>)[k] = v;
      if (v !== null && typeof v === "object") event.markModified(k);
    }
  }
  await event.save();
  return NextResponse.json({ event: serializeEvent(event) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const delFilter: Record<string, unknown> = { _id: id };
  if (user.role !== "admin") delFilter.ownerId = user.id;
  await connectDB();
  const res = await Event.deleteOne(delFilter);
  if (!res.deletedCount) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  // Remove all attached files (maps, scouting photos, …) from storage too
  await deleteEventFiles(id);
  return NextResponse.json({ ok: true });
}
