import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/events/:id/share  { action: "enable" | "rotate" | "revoke" }
export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };

  await connectDB();
  const event = await Event.findOne({ _id: id, ownerId: user.id });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (action === "revoke") {
    event.shareSlug = undefined;
  } else {
    // enable or rotate → new slug
    event.shareSlug = crypto.randomBytes(4).toString("hex");
  }
  await event.save();
  return NextResponse.json({ event: serializeEvent(event) });
}
