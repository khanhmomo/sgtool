import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Template } from "@/lib/models";
import { serializeTemplate } from "@/lib/serialize";
import BookshelfClient from "@/components/BookshelfClient";

export const dynamic = "force-dynamic";

export default async function BookshelfPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { q = "" } = await props.searchParams;

  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = { ownerId: session.user.id };
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { body: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }
  const templates = (await Template.find(filter).sort({ updatedAt: -1 }).lean()).map(
    serializeTemplate
  );

  return (
    <div className="mx-auto max-w-5xl">
      <BookshelfClient templates={templates} initialQuery={q} />
    </div>
  );
}
