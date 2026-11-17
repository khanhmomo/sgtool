import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { requireUser } from "@/auth";
import { validCameraKey } from "@/lib/camera-key";
import { dateRangeYmd } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

/** Access: session owner/team-leader/admin, or a valid share key (?key=…). */
async function access(id: string, key: string | null) {
  await connectDB();
  const keyOk = validCameraKey(id, key);
  const user = await requireUser().catch(() => null);
  if (keyOk) {
    const event = await Event.findById(id);
    return { event, user: null, keyOk: true };
  }
  if (!user) return { event: null, user: null, keyOk: false };
  const isAdmin = (user as { role?: string }).role === "admin";
  const event = await Event.findOne(
    isAdmin ? { _id: id } : { _id: id, $or: [{ ownerId: user.id }, { teamLeaders: user.id }] }
  );
  return { event, user, keyOk: false };
}

const teamView = (e: { photographers?: { id: string; acronym?: string; name?: string; role?: string }[] }) =>
  (e.photographers || []).map((p) => ({ id: p.id, acronym: p.acronym || "", name: p.name || "", role: p.role || "" }));

const eventDates = (e: { date?: string; endDate?: string }) =>
  dateRangeYmd((e.date || "").slice(0, 10), (e.endDate || "").slice(0, 10) || (e.date || "").slice(0, 10), 31);

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const key = new URL(req.url).searchParams.get("key");
  const { event, user, keyOk } = await access(id, key);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const dates = eventDates(event);
  const checks = { ...(event.cameraCheck || {}) } as Record<string, unknown>;
  // Migrate legacy flat format (pid → check) into the first date bucket
  for (const [k, v] of Object.entries(checks)) {
    if (v && typeof v === "object" && "checked" in (v as Record<string, unknown>)) {
      const day = dates[0] || "undated";
      checks[day] = { ...((checks[day] as Record<string, unknown>) || {}), [k]: v };
      delete checks[k];
    }
  }
  const body: Record<string, unknown> = {
    name: event.name,
    type: event.type,
    dates,
    team: teamView(event),
    checks,
  };
  // The share key is only handed to authenticated editors — never to key holders
  if (user && !keyOk) body.key = (await import("@/lib/camera-key")).cameraCheckKey(id);
  return NextResponse.json(body);
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const key = new URL(req.url).searchParams.get("key");
  const { event, user } = await access(id, key);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { date, pid, checked } = await req.json().catch(() => ({}));
  if (!pid || typeof checked !== "boolean" || typeof date !== "string" || !date)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!(event.photographers || []).some((p: { id: string }) => p.id === pid))
    return NextResponse.json({ error: "Unknown photographer" }, { status: 400 });
  const checks = { ...(event.cameraCheck || {}) } as Record<string, Record<string, { checked: boolean; by?: string; at?: number }>>;
  checks[date] = {
    ...(checks[date] || {}),
    [pid]: {
      checked,
      by: user ? ((user as { acronym?: string }).acronym || (user as { name?: string }).name || "TL") : "co-leader",
      at: Date.now(),
    },
  };
  event.cameraCheck = checks;
  event.markModified("cameraCheck");
  await event.save();
  return NextResponse.json({ ok: true, checks });
}
