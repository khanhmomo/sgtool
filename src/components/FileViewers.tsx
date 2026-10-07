"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
} from "lucide-react";
import { cn, fmtSize } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { FileDTO } from "@/types";

// ── PDF viewer (embedded, zoom/fullscreen/download) ────────────────────────
export function PdfViewer({ file, onClose }: { file: FileDTO; onClose: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);

  function fullscreen() {
    frameRef.current?.requestFullscreen?.().catch(() => {
      window.open(file.url, "_blank");
    });
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-2 sm:p-6" onClick={onClose}>
      <div
        ref={frameRef}
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <FileText size={15} className="text-red-600" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
            {file.filename}
          </p>
          <span className="hidden text-xs text-slate-400 sm:inline">{fmtSize(file.size)}</span>
          <a href={file.url} download={file.filename} target="_blank" rel="noopener noreferrer">
            <Button size="xs" variant="outline">
              <Download size={13} /> Download
            </Button>
          </a>
          <Button size="xs" variant="outline" onClick={fullscreen}>
            <Maximize2 size={13} /> Fullscreen
          </Button>
          <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <iframe
          src={`${file.url}#view=FitH&toolbar=1&navpanes=0`}
          title={file.filename}
          className="h-full w-full flex-1 bg-slate-100"
        />
      </div>
    </div>
  );
}

// ── Image lightbox (gallery with prev/next/zoom/fullscreen) ───────────────
export function Lightbox({
  files,
  index,
  onClose,
  onNavigate,
}: {
  files: FileDTO[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const file = files[index];

  const prev = useCallback(
    () => { onNavigate((index - 1 + files.length) % files.length); setZoom(1); },
    [index, files.length, onNavigate]
  );
  const next = useCallback(
    () => { onNavigate((index + 1) % files.length); setZoom(1); },
    [index, files.length, onNavigate]
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, prev, next]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80" onClick={onClose}>
      <div
        className="flex items-center gap-2 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {file.filename}
          <span className="ml-2 text-xs font-normal text-slate-400">
            {index + 1}/{files.length}
          </span>
        </p>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="rounded p-2 hover:bg-white/10" title="Zoom in">
          <ZoomIn size={16} />
        </button>
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="rounded p-2 hover:bg-white/10" title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <a href={file.url} download={file.filename} target="_blank" rel="noopener noreferrer" className="rounded p-2 hover:bg-white/10" title="Download">
          <Download size={16} />
        </a>
        <button
          onClick={() => wrapRef.current?.requestFullscreen?.().catch(() => {})}
          className="rounded p-2 hover:bg-white/10"
          title="Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
        <button onClick={onClose} className="rounded p-2 hover:bg-white/10" title="Close">
          <X size={18} />
        </button>
      </div>
      <div
        ref={wrapRef}
        className="relative flex flex-1 items-center justify-center overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.filename}
          className="max-h-full max-w-full object-contain transition-transform"
          style={{ transform: `scale(${zoom})` }}
        />
        {files.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── File type icon + preview trigger ───────────────────────────────────────
export function FileTypeBadge({ mime }: { mime: string }) {
  const isImg = /^image\//.test(mime);
  const isPdf = /pdf/i.test(mime);
  const isGpx = /gpx|xml/i.test(mime);
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        isPdf && "bg-red-50 text-red-700",
        isImg && "bg-blue-50 text-blue-700",
        isGpx && "bg-emerald-50 text-emerald-700",
        !isPdf && !isImg && !isGpx && "bg-slate-100 text-slate-600"
      )}
    >
      {isPdf ? "PDF" : isImg ? mime.split("/")[1]?.toUpperCase() || "IMG" : isGpx ? "GPX" : "FILE"}
    </span>
  );
}
