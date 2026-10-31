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
  ExternalLink,
} from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import { cn, fmtSize } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { FileDTO } from "@/types";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ── PDF viewer (embedded, zoom/fullscreen/download) ────────────────────────
export function PdfViewer({ file, onClose }: { file: FileDTO; onClose: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [pdfState, setPdfState] = useState<"loading" | "ready" | "error">("loading");

  // Render every page to canvas — natural in-page scroll + pinch zoom on mobile
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    let cancelled = false;
    setPdfState("loading");
    wrap.innerHTML = "";
    (async () => {
      try {
        const doc = await pdfjs.getDocument({ url: file.url }).promise;
        const width = wrap.clientWidth || 360;
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * dpr });
          const cv = document.createElement("canvas");
          cv.width = viewport.width;
          cv.height = viewport.height;
          cv.className = "block w-full";
          cv.style.marginBottom = "6px";
          await page.render({ canvas: cv, viewport }).promise;
          if (cancelled) return;
          wrap.appendChild(cv);
        }
        if (!cancelled) setPdfState("ready");
      } catch {
        if (!cancelled) setPdfState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.url]);

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
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5">
          <FileText size={15} className="text-red-600" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
            {file.filename}
          </p>
          <span className="hidden text-xs text-slate-400 sm:inline">{fmtSize(file.size)}</span>
          <a href={file.url} download={file.filename} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex">
            <Button size="xs" variant="outline">
              <Download size={13} /> Download
            </Button>
          </a>
          <Button size="xs" variant="outline" onClick={fullscreen} className="hidden sm:inline-flex">
            <Maximize2 size={13} /> Fullscreen
          </Button>
          <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        {/* Inline page render (canvas) — scroll/zoom works in-page on all devices.
            canvasWrap holds ONLY manually-appended canvases — React children here
            would be clobbered by innerHTML cleanup and trigger removeChild errors. */}
        <div className="relative flex-1 overflow-auto bg-slate-100">
          <div ref={canvasWrapRef} />
          {pdfState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-slate-400">Rendering PDF…</p>
            </div>
          )}
          {pdfState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-xs text-slate-500">Couldn&apos;t render this PDF in-page.</p>
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <Button variant="accent" size="sm">
                  <ExternalLink size={13} /> Open in new tab
                </Button>
              </a>
            </div>
          )}
        </div>
        {pdfState === "ready" && (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-3 py-2 sm:hidden">
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600">Open</a>
            <span className="text-slate-300">·</span>
            <a href={file.url} download={file.filename} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600">Download</a>
          </div>
        )}
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
  const stripRef = useRef<HTMLDivElement>(null);
  const file = files[index];

  // keep the active thumbnail centered in the strip on any navigation
  useEffect(() => {
    stripRef.current
      ?.querySelector(`[data-thumb="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

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
      {/* thumbnail strip — synced to the active image, click to jump */}
      {files.length > 1 && (
        <div
          ref={stripRef}
          className="flex shrink-0 items-center gap-2 overflow-x-auto px-4 pb-3 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {files.map((f, i) => (
            <button
              key={f.id || i}
              data-thumb={i}
              onClick={() => {
                onNavigate(i);
                setZoom(1);
              }}
              className={cn(
                "h-14 shrink-0 overflow-hidden rounded border-2 transition-opacity",
                i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" loading="lazy" className="h-full w-auto object-cover" />
            </button>
          ))}
        </div>
      )}
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
