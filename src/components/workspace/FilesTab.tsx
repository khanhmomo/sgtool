"use client";

import { useRef, useState } from "react";
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Eye,
  EyeOff,
  ZoomIn,
  FileText,
  ImageIcon,
} from "lucide-react";
import { Card, CardHeader, Empty, Field, Input, Notice, Select } from "@/components/ui";
import { cn, fmtDate, fmtSize, isImageMime, isPdfMime } from "@/lib/utils";
import { FileTypeBadge, Lightbox, PdfViewer } from "@/components/FileViewers";
import type { FileCategory, FileDTO } from "@/types";
import type { TabProps } from "./EventWorkspace";

const CATS: { value: FileCategory; label: string }[] = [
  { value: "map", label: "Course / map" },
  { value: "briefing", label: "Briefing" },
  { value: "venue", label: "Venue" },
  { value: "hotel", label: "Hotel" },
  { value: "other", label: "Other" },
];

export default function FilesTab({
  event,
  files,
  setFiles,
}: TabProps & { files: FileDTO[]; setFiles: React.Dispatch<React.SetStateAction<FileDTO[]>> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<FileCategory>("other");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pdf, setPdf] = useState<FileDTO | null>(null);
  const [imgIndex, setImgIndex] = useState<number | null>(null);

  const images = files.filter((f) => isImageMime(f.mime));

  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", event.id);
      fd.append("category", category);
      fd.append("description", description);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }
      setFiles((f) => [data.file, ...f]);
      setDescription("");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function toggleHidden(f: FileDTO) {
    const res = await fetch(`/api/files/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !f.hidden }),
    });
    if (res.ok) {
      const data = await res.json();
      setFiles((x) => x.map((y) => (y.id === f.id ? data.file : y)));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't update file visibility.");
    }
  }

  async function remove(f: FileDTO) {
    if (!confirm(`Delete ${f.filename}?`)) return;
    const res = await fetch(`/api/files/${f.id}`, { method: "DELETE" });
    if (res.ok) setFiles((x) => x.filter((y) => y.id !== f.id));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader title="Upload file" icon={<Upload size={15} className="text-blue-600" />} />
        <div className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value as FileCategory)}>
                {CATS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Official course map from organizer"
              />
            </Field>
            <Field label="File" hint="PDF · JPG · PNG · WEBP · GPX">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.gpx,.xml"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
              />
            </Field>
          </div>
          {uploading && <Notice kind="info">Uploading…</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`Event files (${files.length})`}
          icon={<FolderOpen size={15} className="text-blue-600" />}
        />
        <div className="divide-y divide-slate-100">
          {files.length === 0 && (
            <div className="p-4">
              <Empty
                icon={<FolderOpen size={26} />}
                title="No files yet"
                hint="Upload course maps (PDF), venue photos or GPX files. PDFs and images open directly in the event page."
              />
            </div>
          )}
          {files.map((f) => {
            const isImg = isImageMime(f.mime);
            const isPdf = isPdfMime(f.mime);
            return (
              <div
                key={f.id}
                className={cn("flex items-center gap-3 px-4 py-3", f.hidden && "opacity-50")}
              >
                {isImg ? (
                  <button
                    onClick={() => setImgIndex(images.findIndex((x) => x.id === f.id))}
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.filename} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                    {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{f.filename}</p>
                    <FileTypeBadge mime={f.mime} />
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {f.description || CATS.find((c) => c.value === f.category)?.label} ·{" "}
                    {fmtSize(f.size)} · {f.uploadedBy} · {fmtDate(f.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {(isPdf || isImg) && (
                    <button
                      title="Preview"
                      onClick={() =>
                        isPdf
                          ? setPdf(f)
                          : setImgIndex(images.findIndex((x) => x.id === f.id))
                      }
                      className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ZoomIn size={15} />
                    </button>
                  )}
                  <button
                    title={f.hidden ? "Hidden on photographer site — click to show" : "Visible on photographer site — click to hide"}
                    onClick={() => toggleHidden(f)}
                    className={cn(
                      "rounded p-2 hover:bg-slate-100",
                      f.hidden ? "text-slate-300" : "text-emerald-500"
                    )}
                  >
                    {f.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <a
                    href={f.url}
                    download={f.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    title="Delete"
                    onClick={() => remove(f)}
                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {pdf && <PdfViewer file={pdf} onClose={() => setPdf(null)} />}
      {imgIndex !== null && images[imgIndex] && (
        <Lightbox
          files={images}
          index={imgIndex}
          onClose={() => setImgIndex(null)}
          onNavigate={setImgIndex}
        />
      )}
    </div>
  );
}
