import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { serializeUser } from "@/lib/serialize";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mb-6 text-sm text-slate-500">Your Team Leader profile</p>
      <SettingsClient user={serializeUser(user)} />
    </div>
  );
}
