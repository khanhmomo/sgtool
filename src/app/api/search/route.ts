import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, FileDoc, Template } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent, serializeFile, serializeTemplate } from "@/lib/serialize";

// GET /api/search?q= — searches the Team Leader's events, templates and files.
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ events: [], templates: [], files: [], positions: [] });

  await connectDB();
  const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [events, templates, files] = await Promise.all([
    Event.find({
      ownerId: user.id,
      $or: [{ name: rx }, { location: rx }, { type: rx }, { notes: rx }, { "documents.title": rx }],
    })
      .sort({ date: -1 })
      .limit(20)
      .lean(),
    Template.find({
      ownerId: user.id,
      $or: [{ title: rx }, { body: rx }, { tags: rx }],
    })
      .limit(20)
      .lean(),
    FileDoc.find({
      ownerId: user.id,
      $or: [{ filename: rx }, { description: rx }],
    })
      .limit(20)
      .lean(),
  ]);

  // Position-level search across own events (acronym or position id)
  const posEvents = await Event.find({
    ownerId: user.id,
    $or: [{ "positions.id": rx }, { "positions.photographer": rx }],
  })
    .select("_id name positions")
    .limit(10)
    .lean();

  const positions: {
    eventId: string;
    eventName: string;
    id: string;
    photographer: string;
    sport: string;
  }[] = [];
  const qLower = q.toLowerCase();
  for (const ev of posEvents) {
    for (const p of (ev as unknown as { positions: { id: string; photographer: string; sport: string }[] }).positions || []) {
      if (
        p.id?.toLowerCase().includes(qLower) ||
        p.photographer?.toLowerCase().includes(qLower)
      ) {
        positions.push({
          eventId: String(ev._id),
          eventName: ev.name,
          id: p.id,
          photographer: p.photographer,
          sport: p.sport,
        });
      }
    }
  }

  return NextResponse.json({
    events: events.map(serializeEvent),
    templates: templates.map(serializeTemplate),
    files: files.map(serializeFile),
    positions,
  });
}
