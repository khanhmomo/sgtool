import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const acronym = (session.user as { acronym?: string }).acronym || "";
  const role = (session.user as { role?: string }).role || "team_leader";

  // Avatar isn't in the JWT — fetch it fresh so uploads show without re-login
  await connectDB();
  const me = await User.findById(session.user.id).select("image").lean();
  const image = (me as { image?: string } | null)?.image || "";

  return (
    <AppShell
      user={{ name: session.user.name || "", acronym, email: session.user.email || "", role, image }}
    >
      {children}
    </AppShell>
  );
}
