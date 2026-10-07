import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SearchClient from "@/components/SearchClient";

export const dynamic = "force-dynamic";

export default async function SearchPage(props: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { q = "" } = await props.searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <SearchClient initialQuery={q} />
    </div>
  );
}
