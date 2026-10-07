import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Template } from "@/lib/models";
import { serializeTemplate } from "@/lib/serialize";
import NewEventForm from "@/components/NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const templates = (
    await Template.find({ ownerId: session.user.id, archived: false }).sort({ title: 1 }).lean()
  ).map(serializeTemplate);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Create Event</h1>
      <p className="mb-6 text-sm text-slate-500">
        Start from scratch or seed the event with a Bookshelf template.
      </p>
      <NewEventForm templates={templates} />
    </div>
  );
}
