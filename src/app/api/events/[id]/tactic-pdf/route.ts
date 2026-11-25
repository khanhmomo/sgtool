import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { requireUser } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { TacticPdf } from "@/lib/tactic-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const date = new URL(req.url).searchParams.get("date") || "";
  await connectDB();
  const isAdmin = (user as { role?: string }).role === "admin";
  const event = await Event.findOne(
    isAdmin ? { _id: id } : { _id: id, $or: [{ ownerId: (user as { id: string }).id }, { teamLeaders: (user as { id: string }).id }] }
  ).populate("teamLeaders", "acronym name");
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Day number = position of the requested date among the event's in-range HYROX days
  let dayNum = 0;
  if (date) {
    const start = String(event.date || "").slice(0, 10);
    const end = String(event.endDate || "").slice(0, 10);
    const inRange = (event.hyrox || [])
      .map((d: { date?: string }) => d.date)
      .filter((dt: string | undefined): dt is string => !!dt && (!start || dt >= start) && (!end || dt <= end))
      .sort();
    dayNum = inRange.indexOf(date) + 1;
  }

  const buf = await renderToBuffer(TacticPdf({ event: serializeEvent(event), onlyDate: date || undefined, dayNum: dayNum || undefined }));
  const base = String(event.name || "tactic").replace(/[^\w\- ]+/g, "").trim() || "tactic";
  const fname = `${base}${date ? `-${dayNum ? `DAY-${dayNum}` : date}` : ""}-tactic.pdf`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
