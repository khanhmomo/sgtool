import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";

/** Public: photographer submits a request from the shared /e/[slug] page. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const slug = String(body?.slug || "").trim();
  const name = String(body?.name || "").trim().slice(0, 120);
  const acronym = String(body?.acronym || "").trim().slice(0, 12).toUpperCase();
  const text = String(body?.body || "").trim().slice(0, 4000);
  if (!slug || !name || !text) {
    return NextResponse.json({ error: "Name and request are required." }, { status: 400 });
  }
  await connectDB();
  const event = await Event.findOne({ shareSlug: slug });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  event.requests = Array.isArray(event.requests) ? event.requests : [];
  event.requests.push({
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name,
    acronym,
    body: text,
    status: "new",
    tlNote: "",
    createdAt: new Date().toISOString(),
  });
  event.markModified("requests"); // Mixed fields don't auto-detect mutations
  await event.save();
  return NextResponse.json({ ok: true });
}
