import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { requireUser } from "@/auth";
import { validCameraKey } from "@/lib/camera-key";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Live camera-check stream — SSE backed by a MongoDB change stream on the
    event doc. Clients get pushed updates in real time; browser EventSource
    auto-reconnects when the serverless function hits maxDuration. */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const key = new URL(req.url).searchParams.get("key");
  const keyOk = validCameraKey(id, key);
  const user = await requireUser().catch(() => null);
  if (!keyOk && !user) return new Response("Unauthorized", { status: 401 });
  await connectDB();
  if (!keyOk) {
    const isAdmin = (user as { role?: string }).role === "admin";
    const ev = await Event.findOne(
      isAdmin ? { _id: id } : { _id: id, $or: [{ ownerId: (user as { id: string }).id }, { teamLeaders: (user as { id: string }).id }] }
    ).select("_id");
    if (!ev) return new Response("Not found", { status: 404 });
  }

  const enc = new TextEncoder();
  let watcher: ReturnType<ReturnType<typeof mongoose.connection.collection>["watch"]> | undefined;
  let hb: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`)); } catch { /* closed */ }
      };
      // Initial snapshot so late joiners don't wait for the next change
      const doc = await Event.findById(id).select("cameraCheck").lean();
      send({ checks: doc?.cameraCheck || {} });
      try {
        watcher = mongoose.connection
          .collection("events")
          .watch([{ $match: { "documentKey._id": new mongoose.Types.ObjectId(id) } }], { fullDocument: "updateLookup" });
        watcher.on("change", (change) => {
          const fd = (change as { fullDocument?: { cameraCheck?: unknown } }).fullDocument;
          if (fd && "cameraCheck" in fd) send({ checks: fd.cameraCheck || {} });
        });
        watcher.on("error", () => { /* change stream unavailable — clients fall back to polling */ });
      } catch { /* watch unsupported (e.g. standalone local mongo) — snapshot already sent */ }
      hb = setInterval(() => {
        try { controller.enqueue(enc.encode(": hb\n\n")); } catch { /* closed */ }
      }, 20000);
      req.signal.addEventListener("abort", () => {
        if (hb) clearInterval(hb);
        void watcher?.close();
        try { controller.close(); } catch { /* closed */ }
      });
    },
    cancel() {
      if (hb) clearInterval(hb);
      void watcher?.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
