import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { renderToBuffer } from "@react-pdf/renderer";
import { HotelPdf } from "@/lib/hotel-pdf";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  await connectDB();
  const event = await Event.findOne({ shareSlug: slug }).populate("teamLeaders", "acronym name");
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buf = await renderToBuffer(HotelPdf({ event: serializeEvent(event) }));
  const fname = `${String(event.name || "hotel").replace(/[^\w\- ]+/g, "").trim() || "hotel"}-hotels.pdf`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
