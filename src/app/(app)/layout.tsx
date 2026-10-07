import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const acronym = (session.user as { acronym?: string }).acronym || "";
  return (
    <AppShell
      user={{ name: session.user.name || "", acronym, email: session.user.email || "" }}
    >
      {children}
    </AppShell>
  );
}
