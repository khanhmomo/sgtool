import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Template } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeTemplate } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(["tactic", "guide", "checklist", "note", "strategy", "other"]).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  body: z.string().max(100_000).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const doc = await Template.findOneAndUpdate(
    { _id: id, ownerId: user.id },
    { $set: parsed.data },
    { new: true }
  );
  if (!doc) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template: serializeTemplate(doc) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  await connectDB();
  const res = await Template.deleteOne({ _id: id, ownerId: user.id });
  if (!res.deletedCount) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
