import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { serializeEvent } from "@/lib/serialize";
import { StationFitTable } from "@/components/workspace/HyroxTactic";

export const dynamic = "force-dynamic";

export default async function StationFitPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await props.params;

  await connectDB();
  const isAdmin = (session.user as { role?: string }).role === "admin";
  const event = await Event.findOne(
    isAdmin ? { _id: id } : { _id: id, $or: [{ ownerId: session.user.id }, { teamLeaders: session.user.id }] }
  );
  if (!event) notFound();
  const dto = serializeEvent(event);

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <h1 className="mb-1 text-lg font-bold text-slate-900">{dto.name} — Station fit</h1>
      <p className="mb-4 text-[11px] text-slate-400">
        Green = covers the station at f/2.8 · yellow = partial fit · red = not covered or slower than f/2.8 · grey = no requirement or no lens data · ! = aperture unknown (f/2.8 unconfirmed)
      </p>
      <div className="inline-block max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <StationFitTable photographers={dto.photographers} withEquipment />
      </div>
    </div>
  );
}
