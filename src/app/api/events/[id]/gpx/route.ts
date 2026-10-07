import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, FileDoc } from "@/lib/models";
import { requireUser } from "@/auth";
import { parseGpx } from "@/lib/gpx";
import { storeFile } from "@/lib/storage";
import { serializeEvent, serializeFile } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/events/:id/gpx — upload a GPX course file, parse it, store on event
export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  await connectDB();
  const event = await Event.findOne({ _id: id, ownerId: user.id });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No GPX file provided" }, { status: 400 });
  }
  if (!/\.gpx$/i.test(file.name) && !/xml|gpx/i.test(file.type)) {
    return NextResponse.json({ error: "Please upload a .gpx file" }, { status: 400 });
  }

  const merge = form?.get("merge") === "1";

  const text = await file.text();
  let course;
  try {
    course = parseGpx(text, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to parse GPX file." },
      { status: 422 }
    );
  }

  if (merge && event.course?.legs?.length) {
    // Append legs from the new file to the existing course
    const existing = event.course;
    event.course = {
      legs: [...existing.legs, ...course.legs],
      fileName: `${existing.fileName} + ${file.name}`,
      updatedAt: new Date().toISOString(),
    };
  } else {
    event.course = course;
  }
  event.markModified("course");
  await event.save();

  // Also keep the raw file in storage so teammates can download it
  let fileDoc = null;
  try {
    const stored = await storeFile(file);
    fileDoc = await FileDoc.create({
      eventId: event._id,
      ownerId: user.id,
      url: stored.url,
      filename: stored.filename,
      mime: "application/gpx+xml",
      size: stored.size,
      category: "map",
      description: "GPX course file",
      uploadedBy: user.acronym,
    });
  } catch (e) {
    console.error("gpx store", e); // course still saved — non-fatal
  }

  return NextResponse.json({
    event: serializeEvent(event),
    file: fileDoc ? serializeFile(fileDoc) : null,
  });
}
