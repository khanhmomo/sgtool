import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Template } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeTemplate } from "@/lib/serialize";

const schema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(["tactic", "guide", "checklist", "note", "strategy", "other"]).default("other"),
  tags: z.array(z.string().max(40)).max(20).default([]),
  body: z.string().max(100_000).default(""),
});

// GET /api/templates?archived=1&q=
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("archived") === "1";
  const q = url.searchParams.get("q") || "";

  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = { ownerId: user.id };
  if (!includeArchived) filter.archived = false;
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { body: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }
  const templates = await Template.find(filter).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ templates: templates.map(serializeTemplate) });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  await connectDB();
  const doc = await Template.create({ ...parsed.data, ownerId: user.id });
  return NextResponse.json({ template: serializeTemplate(doc) }, { status: 201 });
}
