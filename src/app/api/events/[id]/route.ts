import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event, User } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeEvent } from "@/lib/serialize";
import { deleteEventFiles } from "@/lib/files";

// Whitelisted top-level fields that PATCH may update.
const PATCHABLE = new Set([
  "name", "type", "date", "endDate", "location", "country", "organizer", "website",
  "status", "venue", "hotels", "transport", "schedule", "contacts", "photographers",
  "positions", "preSpots", "tactic", "tacticPublished", "tacticDays", "tacticManaged", "course", "documents", "checklist", "notes",
  "teamLeaders",
  "hyrox", "briefing", "requests",
]);

type Ctx = { params: Promise<{ id: string }> };

async function ownedEvent(id: string, user: { id: string; role?: string }) {
  await connectDB();
  const filter: Record<string, unknown> = { _id: id };
  if (user.role !== "admin") {
    // creator or any added team leader gets full access
    filter.$or = [{ ownerId: user.id }, { teamLeaders: user.id }];
  }
  return Event.findOne(filter);
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const event = await ownedEvent(id, user);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: serializeEvent(event) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resolve async/non-merge inputs ONCE, outside the retry loop
  let bestof: unknown;
  const hasBestof = body.bestofUrl !== undefined;
  if (hasBestof) {
    const { fetchBestof } = await import("@/lib/bestof");
    bestof = body.bestofUrl ? await fetchBestof(String(body.bestofUrl)) : null;
  }
  let transferTarget: { _id: unknown; acronym?: string } | null = null;
  if (body.ownerId !== undefined) {
    const tl = await User.findById(String(body.ownerId));
    if (!tl || tl.active === false) {
      return NextResponse.json({ error: "Target Team Leader not found." }, { status: 404 });
    }
    transferTarget = tl;
  }

  // Concurrent-edit-safe persistence — no version checks anywhere:
  // - Plain fields go in as a targeted atomic `$set` — two editors patching
  //   DIFFERENT fields never collide; Mongo serializes writes at the document level.
  // - Per-day merged fields (hyrox, tacticDays) are written per array element with
  //   arrayFilters: only the days the client actually CHANGED are touched. Edits
  //   to different days are fully conflict-free; same-day edits become atomic
  //   last-write-wins at the Mongo level. Unchanged days are never rewritten, so
  //   a stale client can't clobber fresher data.
  const tacticDayKey = (d: Record<string, unknown>) =>
    (d.label ? `|${d.label}` : `${d.date || ""}|`);
  const fresh = () => ownedEvent(id, user);

  const event = await fresh();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  // Keys handled specially below — never copy verbatim in the generic loop
  const skipKeys = new Set(["bestofUrl", "ownerId"]);
  const set: Record<string, unknown> = {};
  const arrayFilters: Record<string, unknown>[] = [];
  const pushes: { field: string; days: Record<string, unknown>[]; keyOf: (d: Record<string, unknown>) => string }[] = [];
  const pulls: { field: string; keys: string[]; key: (d: Record<string, unknown>) => string }[] = [];

  if (hasBestof) set.bestof = bestof;
  if (transferTarget) {
    // Ownership transfer: owner or admin may reassign the event to another Team Leader
    const isOwner = String(event.ownerId) === String(user.id);
    if (user.role !== "admin" && !isOwner) {
      return NextResponse.json({ error: "Only the owner or an admin can transfer event ownership." }, { status: 403 });
    }
    set.ownerId = transferTarget._id;
    set.ownerAcronym = transferTarget.acronym || "";
  }

  /** Plan per-day array writes for one merged field, mirroring mergeDayList semantics:
   *  changed days → replace that array element; days only the client has → push;
   *  days the client deleted → pull. Everything else is left untouched. */
  function planDayMerge(
    field: "hyrox" | "tacticDays",
    current: Record<string, unknown>[],
    incoming: Record<string, unknown>[],
    changed: Set<string>,
    baseKeys: Set<string>,
    key: (d: Record<string, unknown>) => string
  ) {
    const curKeys = new Set(current.map(key));
    const inKeys = new Set(incoming.map(key));
    let fi = 0;
    for (const d of incoming) {
      const k = key(d);
      if (!changed.has(k)) continue; // unchanged — never write, server's version wins
      if (curKeys.has(k)) {
        const fid = `${field}${fi++}`;
        set[`${field}.$[${fid}]`] = d;
        arrayFilters.push({ [`${fid}.${field === "hyrox" ? "date" : "__k"}`]: k });
      }
    }
    const newDays = incoming.filter((d) => !curKeys.has(key(d)));
    if (newDays.length) pushes.push({ field, days: newDays, keyOf: key });
    const deleted = [...baseKeys].filter((k) => curKeys.has(k) && !inKeys.has(k) && changed.has(k));
    if (deleted.length) pulls.push({ field, keys: deleted, key });
  }

  if (Array.isArray(body.tacticDays) && Array.isArray(body.tacticDayChanged)) {
    // tacticDays keys don't map to a plain field — resolve per day inside the op
    const key = tacticDayKey;
    const cur = (event.tacticDays || []) as Record<string, unknown>[];
    const inc = body.tacticDays as Record<string, unknown>[];
    const changed = new Set(body.tacticDayChanged as string[]);
    const baseKeys = new Set((body.tacticDayBaseKeys || []) as string[]);
    const curKeys = new Set(cur.map(key));
    const inKeys = new Set(inc.map(key));
    let fi = 0;
    for (const d of inc) {
      const k = key(d);
      if (!changed.has(k) || !curKeys.has(k)) continue;
      const fid = `td${fi++}`;
      // Positional match needs a real field — tacticDays entries always carry
      // `date` or `label`; match whichever the key encoding used.
      const filter = d.label
        ? { [`${fid}.label`]: d.label }
        : { [`${fid}.date`]: d.date || "", [`${fid}.label`]: { $in: [null, ""] } };
      set[`tacticDays.$[${fid}]`] = d;
      arrayFilters.push(filter as Record<string, unknown>);
    }
    const newDays = inc.filter((d) => !curKeys.has(key(d)));
    if (newDays.length) pushes.push({ field: "tacticDays", days: newDays, keyOf: key });
    const deleted = [...baseKeys].filter((k) => curKeys.has(k) && !inKeys.has(k) && changed.has(k));
    if (deleted.length) pulls.push({ field: "tacticDays", keys: deleted, key });
    skipKeys.add("tacticDays");
  }
  if (Array.isArray(body.hyrox) && Array.isArray(body.hyroxChanged)) {
    const key = (d: Record<string, unknown>) => String(d.date || "");
    planDayMerge(
      "hyrox",
      (event.hyrox || []) as Record<string, unknown>[],
      body.hyrox as Record<string, unknown>[],
      new Set(body.hyroxChanged as string[]),
      new Set((body.hyroxBaseKeys || []) as string[]),
      key
    );
    skipKeys.add("hyrox");
  }

  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE.has(k) && !skipKeys.has(k)) set[k] = v;
  }

  await connectDB();
  // 1) Targeted writes — plain fields + changed day elements, one atomic update
  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(update).length) {
    await Event.updateOne({ _id: id }, update, arrayFilters.length ? { arrayFilters } : {});
  }
  // 2) Added days — push only if the day key still doesn't exist server-side.
  // The filter guards the race where two editors create the same day at once:
  // the slower push simply matches nothing instead of duplicating the day.
  for (const p of pushes) {
    for (const d of p.days) {
      const k = p.keyOf(d);
      const existsField = p.field === "hyrox" ? `${p.field}.date` : `${p.field}.label`;
      const existsVal = p.field === "hyrox" ? k : k.startsWith("|") ? k.slice(1) : null;
      if (existsVal === null) {
        // unlabeled tacticDay — guard on date
        await Event.updateOne(
          { _id: id, [`${p.field}.date`]: { $ne: k.replace(/\|$/, "") } },
          { $push: { [p.field]: d } }
        );
      } else {
        await Event.updateOne({ _id: id, [existsField]: { $ne: existsVal } }, { $push: { [p.field]: d } });
      }
    }
  }
  // 3) Deleted days — pull by key field
  for (const p of pulls) {
    if (p.field === "hyrox") {
      await Event.updateOne({ _id: id }, { $pull: { hyrox: { date: { $in: p.keys } } } });
    } else {
      // tacticDays composite keys — pull one at a time by matching the encoded key parts
      for (const k of p.keys) {
        const label = k.startsWith("|") ? k.slice(1) : null;
        if (label) {
          await Event.updateOne({ _id: id }, { $pull: { tacticDays: { label } } });
        } else {
          const date = k.replace(/\|$/, "");
          await Event.updateOne({ _id: id }, { $pull: { tacticDays: { date, label: { $in: [null, ""] } } } });
        }
      }
    }
  }
  const done = await fresh();
  return NextResponse.json({ event: serializeEvent(done) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const delFilter: Record<string, unknown> = { _id: id };
  if (user.role !== "admin") delFilter.ownerId = user.id;
  await connectDB();
  const res = await Event.deleteOne(delFilter);
  if (!res.deletedCount) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  // Remove all attached files (maps, scouting photos, …) from storage too
  await deleteEventFiles(id);
  return NextResponse.json({ ok: true });
}
