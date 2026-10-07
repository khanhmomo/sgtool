import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Template } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeTemplate } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/templates/:id/copy — duplicate a bookshelf template
export async function POST(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  await connectDB();
  const src = await Template.findOne({ _id: id, ownerId: user.id });
  if (!src) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const copy = await Template.create({
    ownerId: user.id,
    title: `${src.title} (copy)`,
    category: src.category,
    tags: src.tags,
    body: src.body,
    archived: false,
  });
  return NextResponse.json({ template: serializeTemplate(copy) }, { status: 201 });
}
