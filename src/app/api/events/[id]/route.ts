import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent } from "@/lib/serialize";

// Whitelisted top-level fields that PATCH may update.
const PATCHABLE = new Set([
  "name", "type", "date", "endDate", "location", "country", "organizer", "website",
  "status", "venue", "hotel", "transport", "schedule", "contacts", "photographers",
  "positions", "preSpots", "tactic", "course", "documents", "checklist", "notes",
  "hyrox",
]);

type Ctx = { params: Promise<{ id: string }> };

async function ownedEvent(id: string, userId: string) {
  await connectDB();
  return Event.findOne({ _id: id, ownerId: userId });
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const event = await ownedEvent(id, user.id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: serializeEvent(event) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const event = await ownedEvent(id, user.id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
  const res = await Event.deleteOne({ _id: id, ownerId: user.id });
  if (!res.deletedCount) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
