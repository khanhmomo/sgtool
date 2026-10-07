import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Event, Template } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent } from "@/lib/serialize";
import type { DocCategory } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ templateId: z.string().min(1) });

// POST /api/events/:id/add-template — copy a Bookshelf template into the event.
// The event receives a snapshot copy: later template edits don't affect the event.
export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await connectDB();
  const [event, tpl] = await Promise.all([
    Event.findOne({ _id: id, ownerId: user.id }),
    Template.findOne({ _id: parsed.data.templateId, ownerId: user.id }),
  ]);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const category: DocCategory = tpl.category === "strategy" ? "tactic" : tpl.category;

  const docs = Array.isArray(event.documents) ? [...event.documents] : [];
  docs.push({
    id: crypto.randomUUID().slice(0, 8),
    title: tpl.title,
    category,
    body: tpl.body,
    sourceTemplateId: String(tpl._id),
    updatedAt: new Date().toISOString(),
  });
  event.documents = docs;

  // Checklist templates also seed the operational checklist
  if (tpl.category === "checklist") {
    const groups = Array.isArray(event.checklist) ? [...event.checklist] : [];
    groups.push({
      id: crypto.randomUUID().slice(0, 8),
      title: tpl.title,
      items: tpl.body
        .split("\n")
        .map((l: string) => l.replace(/^[-*•☐✓\[\]xX\s]+/, "").trim())
        .filter(Boolean)
        .map((text: string) => ({ id: crypto.randomUUID().slice(0, 8), text, done: false })),
    });
    event.checklist = groups;
    event.markModified("checklist");
  }

  event.markModified("documents");
  await event.save();
  return NextResponse.json({ event: serializeEvent(event) });
}
