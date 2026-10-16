import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { requireUser } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * SSE stream of the event's requests array. Polls Mongo every 2s and pushes
 * the full array whenever it changes — near-realtime for the Requests tab.
 *   GET /api/requests/stream?event=<id>
 */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const id = new URL(req.url).searchParams.get("event") || "";
  if (!id) return new Response("Missing event", { status: 400 });

  await connectDB();
  const filter: Record<string, unknown> = { _id: id };
  if ((user as { role?: string }).role !== "admin") filter.ownerId = (user as { id: string }).id;
  const ev = await Event.findOne(filter).select("_id").lean();
  if (!ev) return new Response("Not found", { status: 404 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let last = "";
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {}
      };
      const tick = async () => {
        try {
          const e = await Event.findById(id).select("requests").lean();
          const json = JSON.stringify(e?.requests || []);
          if (json !== last) {
            last = json;
            send(`data: ${json}\n\n`);
          }
        } catch {}
      };
      void tick();
      const poll = setInterval(tick, 2_000);
      // heartbeat keeps proxies from closing the connection
      const ping = setInterval(() => send(`: ping\n\n`), 15_000);
      req.signal.addEventListener("abort", () => {
        clearInterval(poll);
        clearInterval(ping);
        try {
          controller.close();
        } catch {}
      });
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
