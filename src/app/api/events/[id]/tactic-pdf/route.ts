import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { requireUser } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { TacticPdf } from "@/lib/tactic-pdf";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const isAdmin = (user as { role?: string }).role === "admin";
  const event = await Event.findOne(
    isAdmin ? { _id: id } : { _id: id, $or: [{ ownerId: (user as { id: string }).id }, { teamLeaders: (user as { id: string }).id }] }
  ).populate("teamLeaders", "acronym name");
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buf = await renderToBuffer(TacticPdf({ event: serializeEvent(event) }));
  const fname = `${String(event.name || "tactic").replace(/[^\w\- ]+/g, "").trim() || "tactic"}-tactic.pdf`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
