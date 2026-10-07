import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Event, FileDoc } from "@/lib/models";
import { serializeEvent, serializeFile } from "@/lib/serialize";
import PublicEvent from "@/components/PublicEvent";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  await connectDB();
  const event = await Event.findOne({ shareSlug: slug }).select("name").lean();
  return { title: event ? `${event.name} — Sportograf TL` : "Event — Sportograf TL" };
}

export default async function PublicEventPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  await connectDB();
  const event = await Event.findOne({ shareSlug: slug });
  if (!event) {
    notFound();
  }
  const files = await FileDoc.find({ eventId: event._id, hidden: { $ne: true } }).sort({ createdAt: -1 }).lean();

  return (
    <PublicEvent event={serializeEvent(event)} files={files.map(serializeFile)} />
  );
}
