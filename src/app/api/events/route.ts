import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Event, Template } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent } from "@/lib/serialize";
import { fetchBestof } from "@/lib/bestof";
import { normBreakTables, normStationName } from "@/lib/hyrox-breaks";
import type { EventDoc, HyroxDayPlan } from "@/types";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.string().max(60).optional(),
  date: z.string().max(20).optional(),
  endDate: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  organizer: z.string().max(200).optional(),
  website: z.string().max(300).optional(),
  bestofUrl: z.string().max(300).optional(),
  templateId: z.string().optional(),
});

// GET /api/events — light list for pickers (e.g. importing break schedules
// into a Bookshelf template). Returns name/dates plus each HYROX day's
// normalized break tables — no heavy fields.
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const isAdmin = (user as { role?: string }).role === "admin";
  const filter = isAdmin
    ? {}
    : { $or: [{ ownerId: user.id }, { teamLeaders: user.id }] };
  const events = await Event.find(filter).select("name date endDate hyrox").sort({ date: -1 }).lean();
  return NextResponse.json({
    events: events.map((e) => ({
      id: String(e._id),
      name: e.name,
      date: e.date || "",
      endDate: e.endDate || "",
      days: ((Array.isArray(e.hyrox) ? e.hyrox : []) as HyroxDayPlan[]).map((d) => ({
        date: d?.date || "",
        breaks: normBreakTables(d?.tactic?.breaks),
        // Per-station break windows from the shift table's "Breaks" column —
        // where real events actually store break times (st.breaks).
        stationBreaks: (d?.tactic?.shifts || []).map((shift) => {
          const out: Record<string, { start: string; end: string }[]> = {};
          for (const st of shift || []) {
            const name = normStationName(st?.station || "");
            const raw: { start?: string; end?: string }[] = Array.isArray(st?.breaks)
              ? st.breaks
              : st?.breaks
                ? [{ start: st.breaks }]
                : [];
            const list = raw
              .map((w) => ({ start: w?.start || "", end: w?.end || "" }))
              .filter((w) => /^\d{2}:\d{2}$/.test(w.start));
            if (name && list.length) out[name] = list;
          }
          return out;
        }),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  await connectDB();

  // Optionally pre-fill documents/checklist from a bookshelf template
  const documents: EventDoc[] = [];
  let checklist: { id: string; title: string; items: { id: string; text: string; done: boolean }[] }[] = [];
  if (d.templateId) {
    const tpl = await Template.findOne({ _id: d.templateId, ownerId: user.id });
    if (tpl) {
      documents.push({
        id: crypto.randomUUID().slice(0, 8),
        title: tpl.title,
        category: tpl.category === "strategy" ? "tactic" : tpl.category,
        body: tpl.body,
        sourceTemplateId: String(tpl._id),
        updatedAt: new Date().toISOString(),
      });
      if (tpl.category === "checklist") {
        checklist = [
          {
            id: crypto.randomUUID().slice(0, 8),
            title: tpl.title,
            items: tpl.body
              .split("\n")
              .map((l: string) => l.replace(/^[-*•]\s*/, "").trim())
              .filter(Boolean)
              .map((text: string) => ({ id: crypto.randomUUID().slice(0, 8), text, done: false })),
          },
        ];
      }
    }
  }

  const event = await Event.create({
    ownerId: user.id,
    ownerAcronym: user.acronym,
    name: d.name,
    type: d.type || "Triathlon",
    date: d.date || "",
    endDate: d.endDate || "",
    location: d.location || "",
    country: d.country || "",
    organizer: d.organizer || "",
    website: d.website || "",
    status: "planning",
    shareSlug: crypto.randomBytes(4).toString("hex"), // e.g. a1b2c3d4
    documents,
    checklist,
    bestof: d.bestofUrl ? await fetchBestof(d.bestofUrl) : null,
  });

  return NextResponse.json({ event: serializeEvent(event) }, { status: 201 });
}
