import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, User } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent } from "@/lib/serialize";

// Whitelisted top-level fields that PATCH may update.
const PATCHABLE = new Set([
  "name", "type", "date", "endDate", "location", "country", "organizer", "website",
  "status", "venue", "hotels", "transport", "schedule", "contacts", "photographers",
  "positions", "preSpots", "tactic", "course", "documents", "checklist", "notes",
  "hyrox",
]);

type Ctx = { params: Promise<{ id: string }> };

async function ownedEvent(id: string, user: { id: string; role?: string }) {
  await connectDB();
  const filter: Record<string, unknown> = { _id: id };
  if (user.role !== "admin") filter.ownerId = user.id; // admins can access any event
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

  // Admin takeover: reassign the event to another Team Leader
  if (body.ownerId !== undefined) {
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can transfer event ownership." }, { status: 403 });
    }
    const tl = await User.findById(String(body.ownerId));
    if (!tl || tl.active === false) {
      return NextResponse.json({ error: "Target Team Leader not found." }, { status: 404 });
    }
    event.ownerId = tl._id;
    event.ownerAcronym = tl.acronym || "";
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
  const res = await Event.deleteOne(delFilter);
  if (!res.deletedCount) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
