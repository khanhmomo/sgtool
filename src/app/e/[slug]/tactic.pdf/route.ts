import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { renderToBuffer } from "@react-pdf/renderer";
import { TacticPdf } from "@/lib/tactic-pdf";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  await connectDB();
  const event = await Event.findOne({ shareSlug: slug }).populate("teamLeaders", "acronym name");
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
