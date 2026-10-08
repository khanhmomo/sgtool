import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AccountsClient from "@/components/AccountsClient";

export default async function AccountsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Accounts</h1>
      <p className="mb-4 text-sm text-slate-500">
        Create and manage Team Leader accounts. New accounts must set their own password on first
        sign-in.
      </p>
      <AccountsClient meId={session.user.id || ""} />
    </div>
  );
}
