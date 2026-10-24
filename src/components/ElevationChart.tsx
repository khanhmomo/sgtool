"use client";

import { useRef, useState } from "react";
import { Mountain } from "lucide-react";
import type { CoursePoint } from "@/types";

/** Elevation profile for one course leg — hover shows distance + elevation. */
export default function ElevationChart({
  name,
  color = "#64748b",
  points,
  onHover,
}: {
  name: string;
  color?: string;
  points: CoursePoint[];
  /** Fired with the hovered course point (or null on leave) so a map can mirror it */
  onHover?: (pt: { lat: number; lng: number } | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null); // index into `pts`

  // Points with elevation; nothing to draw without it
  const pts = points.filter((p) => p.ele !== undefined);
  if (pts.length < 2) return null;

  const W = 800;
  const H = 120;
  const PAD_X = 44;
  const PAD_Y = 8;

  const minEle = Math.min(...pts.map((p) => p.ele!));
  const maxEle = Math.max(...pts.map((p) => p.ele!));
  const totalKm = pts[pts.length - 1].d;
  const spanEle = Math.max(1, maxEle - minEle);
  const spanKm = Math.max(0.1, totalKm);

  const x = (d: number) => PAD_X + (d / spanKm) * (W - PAD_X - 8);
  const y = (ele: number) => PAD_Y + (1 - (ele - minEle) / spanEle) * (H - PAD_Y - 18);

  // Elevation gain/loss over the profile
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < pts.length; i++) {
    const delta = pts[i].ele! - pts[i - 1].ele!;
    if (delta > 0) gain += delta;
    else loss -= delta;
  }

  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.ele!).toFixed(1)}`).join(" ");
  const area = `${path} L${x(totalKm).toFixed(1)},${H - 18} L${x(0).toFixed(1)},${H - 18} Z`;

  const hp = hover !== null ? pts[hover] : null;

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const dKm = Math.max(0, Math.min(totalKm, ((px - PAD_X) / (W - PAD_X - 8)) * spanKm));
    // binary search nearest d
    let lo = 0;
    let hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].d < dKm) lo = mid;
      else hi = mid;
    }
    const idx = Math.abs(pts[lo].d - dKm) <= Math.abs(pts[hi].d - dKm) ? lo : hi;
    setHover(idx);
    onHover?.({ lat: pts[idx].lat, lng: pts[idx].lng });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {name}
        </span>
        <span className="text-[11px] text-slate-400">
          {totalKm.toFixed(1)} km · {minEle.toFixed(0)}–{maxEle.toFixed(0)} m ·
          ▲{gain.toFixed(0)} m · ▼{loss.toFixed(0)} m
        </span>
        {hp && (
          <span className="ml-auto flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
            <Mountain size={11} className="text-emerald-400" />
            {hp.d.toFixed(2)} km — {hp.ele!.toFixed(0)} m
          </span>
        )}
      </div>
      <div
        ref={ref}
        className="relative cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => {
          setHover(null);
          onHover?.(null);
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
          {/* axis labels */}
          <text x={2} y={PAD_Y + 8} fontSize={9} fill="#94a3b8">{maxEle.toFixed(0)}m</text>
          <text x={2} y={H - 20} fontSize={9} fill="#94a3b8">{minEle.toFixed(0)}m</text>
          <text x={PAD_X} y={H - 4} fontSize={9} fill="#94a3b8">0 km</text>
          <text x={W - 8} y={H - 4} fontSize={9} fill="#94a3b8" textAnchor="end">{totalKm.toFixed(1)} km</text>
          <line x1={PAD_X} y1={H - 18} x2={W - 8} y2={H - 18} stroke="#e2e8f0" strokeWidth={1} />
          <path d={area} fill={color} fillOpacity={0.12} />
          <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
          {hp && (
            <>
              <line
                x1={x(hp.d)} y1={PAD_Y} x2={x(hp.d)} y2={H - 18}
                stroke="#0f172a" strokeWidth={1} strokeDasharray="3 2"
              />
              <circle cx={x(hp.d)} cy={y(hp.ele!)} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5} />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
