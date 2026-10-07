import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import { FileDoc } from "@/lib/models";
import { serializeFile } from "@/lib/serialize";
import { requireUser } from "@/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  await connectDB();
  const doc = await FileDoc.findOne({ _id: id, ownerId: user.id });
  if (!doc) return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (typeof body.hidden === "boolean") doc.hidden = body.hidden;
  if (typeof body.description === "string") doc.description = body.description;
  await doc.save();

  return NextResponse.json({ ok: true, file: serializeFile(doc) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  await connectDB();
  const doc = await FileDoc.findOne({ _id: id, ownerId: user.id });
  if (!doc) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Best-effort removal of the stored object
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN && doc.url.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(doc.url);
    } else if (doc.url.startsWith("/uploads/")) {
      await fs.unlink(path.join(process.cwd(), "public", doc.url)).catch(() => {});
    }
  } catch (e) {
    console.error("file delete storage", e); // still remove metadata
  }

  await FileDoc.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
