import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, FileDoc, Template } from "@/lib/models";
import { requireUser } from "@/auth";
import { storeFile } from "@/lib/storage";
import { serializeFile } from "@/lib/serialize";

// GET /api/files?eventId= | ?templateId= | (none = all mine)
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const templateId = url.searchParams.get("templateId");

  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = { ownerId: user.id };
  if (eventId) filter.eventId = eventId;
  if (templateId) filter.templateId = templateId;
  const files = await FileDoc.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ files: files.map(serializeFile) });
}

// POST /api/files — multipart upload. Fields: file, eventId?, templateId?, category?, description?
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const eventId = String(form?.get("eventId") || "");
  const templateId = String(form?.get("templateId") || "");
  const category = String(form?.get("category") || "other");
  const description = String(form?.get("description") || "");

  await connectDB();

  // Ownership check on the parent entity
  if (eventId) {
    const ev = await Event.findOne({ _id: eventId, ownerId: user.id }).select("_id");
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  } else if (templateId) {
    const tp = await Template.findOne({ _id: templateId, ownerId: user.id }).select("_id");
    if (!tp) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let stored;
  try {
    stored = await storeFile(file);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed. Please try again." },
      { status: 422 }
    );
  }

  const doc = await FileDoc.create({
    eventId: eventId || undefined,
    templateId: templateId || undefined,
    ownerId: user.id,
    url: stored.url,
    filename: stored.filename,
    mime: stored.mime,
    size: stored.size,
    category: ["map", "briefing", "venue", "hotel", "other"].includes(category)
      ? category
      : "other",
    description,
    uploadedBy: user.acronym,
  });

  return NextResponse.json({ file: serializeFile(doc) }, { status: 201 });
}
