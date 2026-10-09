import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewEventForm from "@/components/NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Create Event</h1>
      <p className="mb-6 text-sm text-slate-500">
        Fill in the event details — briefing templates can be imported later from your Bookshelf.
      </p>
      <NewEventForm />
    </div>
  );
}
