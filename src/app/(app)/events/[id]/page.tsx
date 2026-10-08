import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Event, FileDoc } from "@/lib/models";
import { serializeEvent, serializeFile } from "@/lib/serialize";
import EventWorkspace from "@/components/workspace/EventWorkspace";

export const dynamic = "force-dynamic";

export default async function EventPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  await connectDB();
  const isAdmin = (session.user as { role?: string }).role === "admin";
  const event = await Event.findOne(isAdmin ? { _id: id } : { _id: id, ownerId: session.user.id });
  if (!event) notFound();
  const files = await FileDoc.find({ eventId: event._id }).sort({ createdAt: -1 }).lean();

  return (
    <EventWorkspace
      event={serializeEvent(event)}
      files={files.map(serializeFile)}
      initialTab={tab}
    />
  );
}
