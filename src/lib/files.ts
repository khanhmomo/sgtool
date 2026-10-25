import path from "path";
import { promises as fs } from "fs";
import { Event, FileDoc, Template } from "@/lib/models";

/** Delete one FileDoc's stored object (blob or local disk). */
async function removeStoredObject(url: string) {
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN && url.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(url);
    } else if (url.startsWith("/uploads/")) {
      await fs.unlink(path.join(process.cwd(), "public", url)).catch(() => {});
    }
  } catch {
    // storage cleanup is best-effort — metadata still gets removed
  }
}

/**
 * Remove an owner's FileDocs that aren't attached to anything:
 * no eventId/templateId at all, or references to deleted events/templates.
 * Also deletes their stored objects. Returns how many docs were purged.
 * Requires connectDB() to have run already.
 */
export async function purgeOrphanFiles(ownerId: string): Promise<number> {
  const docs = await FileDoc.find({ ownerId })
    .select("_id url eventId templateId")
    .lean();
  if (!docs.length) return 0;

  // Which referenced parents actually exist?
  const eventIds = [...new Set(docs.map((d) => String(d.eventId || "")).filter(Boolean))];
  const templateIds = [...new Set(docs.map((d) => String(d.templateId || "")).filter(Boolean))];
  const [events, templates] = await Promise.all([
    eventIds.length ? Event.find({ _id: { $in: eventIds } }).select("_id").lean() : [],
    templateIds.length ? Template.find({ _id: { $in: templateIds } }).select("_id").lean() : [],
  ]);
  const liveEvents = new Set(events.map((e) => String(e._id)));
  const liveTemplates = new Set(templates.map((t) => String(t._id)));

  const orphans = docs.filter((d) => {
    const ev = d.eventId ? String(d.eventId) : "";
    const tp = d.templateId ? String(d.templateId) : "";
    if (!ev && !tp) return true; // attached to nothing
    if (ev && !liveEvents.has(ev)) return true; // event was deleted
    if (tp && !liveTemplates.has(tp)) return true; // template was deleted
    return false;
  });
  if (!orphans.length) return 0;

  await Promise.all(orphans.map((d) => removeStoredObject(d.url)));
  await FileDoc.deleteMany({ _id: { $in: orphans.map((d) => d._id) } });
  return orphans.length;
}
