import Link from "next/link";
import { FolderOpen, FileText, ImageIcon } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { FileDoc } from "@/lib/models";
import { serializeFile } from "@/lib/serialize";
import { fmtDate, fmtSize, isImageMime, isPdfMime } from "@/lib/utils";
import { Card, Empty } from "@/components/ui";
import { FileTypeBadge } from "@/components/FileViewers";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const files = (
    await FileDoc.find({ ownerId: session.user.id })
      .populate("eventId", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
  ).map((f) => ({
    ...serializeFile(f),
    eventName: (f as unknown as { eventId?: { name?: string } }).eventId?.name || "",
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
        <FolderOpen size={22} className="text-blue-600" /> Files
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        All uploads across your events and Bookshelf ({files.length})
      </p>

      {files.length === 0 ? (
        <Empty
          icon={<FolderOpen size={28} />}
          title="No files yet"
          hint="Upload files inside an event's Files tab — PDFs and images preview inline."
        />
      ) : (
        <Card className="divide-y divide-slate-100">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                {isPdfMime(f.mime) ? <FileText size={16} /> : isImageMime(f.mime) ? <ImageIcon size={16} /> : <FolderOpen size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                  >
                    {f.filename}
                  </a>
                  <FileTypeBadge mime={f.mime} />
                </div>
                <p className="truncate text-xs text-slate-500">
                  {f.eventId && f.eventName ? (
                    <>
                      <Link href={`/events/${f.eventId}?tab=files`} className="text-blue-600 hover:underline">
                        {f.eventName}
                      </Link>
                      {" · "}
                    </>
                  ) : f.templateId ? (
                    "Bookshelf · "
                  ) : null}
                  {fmtSize(f.size)} · {f.uploadedBy} · {fmtDate(f.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
