"use client";

import { useEffect, useRef, useState } from "react";
import type { CourseLeg, Position, PreSpot } from "@/types";
import { SPORT_META } from "@/lib/design";
import { fmtDistances } from "@/lib/utils";
import type L from "leaflet";

interface Props {
  legs: CourseLeg[];
  positions: Position[];
  preSpots?: PreSpot[];
  showCourse?: boolean;
  showPositions?: boolean;
  selectedId?: string | null;
  onSelectPosition?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  /** Point under the elevation-chart cursor — shows a moving dot on the map */
  hoverPoint?: { lat: number; lng: number } | null;
  /** Override marker background per position id (e.g. tactic row color) */
  positionColors?: Record<string, string>;
  height?: number;
}

/**
 * Interactive course map (Leaflet + OSM tiles).
 * Renders GPX legs as colored polylines, start/finish flags, direction arrows,
 * and photographer position markers with acronym + distances.
 */
export default function CourseMap({
  legs,
  positions,
  preSpots = [],
  showCourse = true,
  showPositions = true,
  selectedId,
  onSelectPosition,
  onMapClick,
  hoverPoint,
  positionColors,
  height = 420,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const posRef = useRef<L.LayerGroup | null>(null);
  const hoverRef = useRef<L.CircleMarker | null>(null);
  /** Legs already framed by fitBounds — keeps user zoom when only positions change */
  const fittedLegsRef = useRef<CourseLeg[] | null>(null);
  const [satellite, setSatellite] = useState(false);
  // The click handler is registered once at init — keep latest callback in a ref
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  });

  function renderLayers(leaflet: typeof L) {
    const map = mapRef.current;
    const courseGroup = layersRef.current;
    const posGroup = posRef.current;
    if (!map || !courseGroup || !posGroup) return;

    courseGroup.clearLayers();
    posGroup.clearLayers();
    const bounds: [number, number][] = [];

    if (showCourse) {
      legs.forEach((leg) => {
        const color = leg.color || SPORT_META[leg.sport]?.line || SPORT_META.other.line;
        const latlngs = leg.points.map((p) => [p.lat, p.lng] as [number, number]);
        if (latlngs.length < 2) return;
        latlngs.forEach((ll) => bounds.push(ll));

        leaflet
          .polyline(latlngs, { color: "#ffffff", weight: 7, opacity: 0.7 })
          .addTo(courseGroup);
        leaflet
          .polyline(latlngs, { color, weight: 4, opacity: 0.95 })
          .addTo(courseGroup);

        // start / finish flags
        const mk = (pt: [number, number], label: string, bg: string) =>
          leaflet
            .marker(pt, {
              icon: leaflet.divIcon({
                className: "",
                html: `<div class="course-flag" style="background:${bg};color:#fff;width:26px;height:26px">${label}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13],
              }),
              interactive: false,
            })
            .addTo(courseGroup);
        mk(latlngs[0], "S", "#0f172a");
        mk(latlngs[latlngs.length - 1], "F", "#dc2626");

        // direction arrows every ~10% of the leg
        const pts = leg.points;
        const total = pts[pts.length - 1].d || 1;
        for (let frac = 0.1; frac < 0.95; frac += 0.1) {
          const target = frac * total;
          const idx = pts.findIndex((p) => p.d >= target);
          if (idx <= 0 || idx >= pts.length) continue;
          const a = pts[idx - 1];
          const b = pts[idx];
          const angle =
            (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
          leaflet
            .marker([b.lat, b.lng], {
              icon: leaflet.divIcon({
                className: "",
                html: `<div class="course-arrow" style="transform:rotate(${angle}deg)">▲</div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              }),
              interactive: false,
            })
            .addTo(courseGroup);
        }
      });
    }

    if (showPositions) {
      positions.forEach((pos) => {
        if (pos.lat === null || pos.lng === null) return;
        const meta = SPORT_META[pos.sport] || SPORT_META.other;
        const isSel = pos.id === selectedId;
        // Long KMZ spot names need a wider pill — size the icon to the label
        // so white text stays inside the colored box instead of spilling over.
        const label = pos.id.length > 24 ? `${pos.id.slice(0, 23)}…` : `${pos.id}`;
        const w = Math.max(isSel ? 44 : 36, label.length * 7 + 14);
        const h = isSel ? 22 : 18;
        const bg = positionColors?.[pos.id] || meta.hex;
        // Light tactic colors (e.g. #fef3c7) need dark text to stay readable
        const hexNum = /^#?[0-9a-f]{6}$/i.test(bg) ? parseInt(bg.replace("#", ""), 16) : 0;
        const lum = (0.299 * (hexNum >> 16) + 0.587 * ((hexNum >> 8) & 255) + 0.114 * (hexNum & 255)) / 255;
        const fg = lum > 0.6 ? "#1e293b" : "#ffffff";
        const icon = leaflet.divIcon({
          className: "",
          html: `<div class="pos-marker" style="background:${bg};color:${fg};width:${w}px;height:${h}px;padding:0 5px;${isSel ? "outline:3px solid #fbbf24;" : ""}">${label}</div>`,
          iconSize: [w + 2, h + 2],
          iconAnchor: [(w + 2) / 2, (h + 2) / 2],
        });
        const marker = leaflet
          .marker([pos.lat, pos.lng], { icon })
          .addTo(posGroup);
        const tip = `${pos.id} — ${meta.label} — ${fmtDistances(pos.distances)}${pos.notes ? `\n${pos.notes}` : ""}`;
        marker.bindTooltip(tip, { direction: "top", offset: [0, -12] });
        marker.on("click", (e) => {
          e.originalEvent?.stopPropagation?.();
          onSelectPosition?.(pos.id);
        });
        bounds.push([pos.lat, pos.lng]);
      });
    }

    // Pre-spots imported from KMZ — grey until promoted into the position list
    preSpots.forEach((ps) => {
      const bg = ps.added ? "#16a34a" : "#94a3b8"; // bold green once added, grey otherwise
      const icon = leaflet.divIcon({
        className: "",
        html: `<div class="pos-marker" style="background:${bg};min-width:30px;height:18px;padding:0 6px;opacity:${ps.added ? 1 : 0.85};${ps.added ? "outline:2px solid #ffffff;font-weight:800;" : ""}">${ps.name}</div>`,
        iconSize: [ps.name.length * 7 + 14, 20],
        iconAnchor: [(ps.name.length * 7 + 14) / 2, 10],
      });
      leaflet
        .marker([ps.lat, ps.lng], { icon, interactive: false })
        .bindTooltip(
          `${ps.name} — pre-spot${ps.added ? " (added to position list)" : " (not added yet)"}`,
          { direction: "top", offset: [0, -10] }
        )
        .addTo(posGroup);
      bounds.push([ps.lat, ps.lng]);
    });

    if (bounds.length && fittedLegsRef.current !== legs) {
      fittedLegsRef.current = legs;
      map.fitBounds(leaflet.latLngBounds(bounds).pad(0.12));
    }
  }

  // init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !elRef.current || mapRef.current) return;
      const map = leaflet.map(elRef.current, {
        zoomControl: true,
        attributionControl: false, // hide "Leaflet | © Google Maps" corner label
      });
      // Google Maps raster tiles — lyrs=m roadmap, lyrs=y satellite+labels.
      tileRef.current = leaflet
        .tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          subdomains: ["0", "1", "2", "3"],
          attribution: "&copy; Google Maps",
          maxZoom: 20,
        })
        .addTo(map);
      layersRef.current = leaflet.layerGroup().addTo(map);
      posRef.current = leaflet.layerGroup().addTo(map);
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
      renderLayers(leaflet);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-render layers only when map data changes — not on unrelated parent
  // re-renders (e.g. hoverPoint state churn would otherwise reset zoom)
  useEffect(() => {
    (async () => {
      const leaflet = await import("leaflet");
      renderLayers(leaflet);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, positions, preSpots, showCourse, showPositions, selectedId, positionColors]);

  // Elevation-chart hover dot — lightweight, updates without re-rendering layers
  useEffect(() => {
    (async () => {
      const leaflet = await import("leaflet");
      const map = mapRef.current;
      if (!map) return;
      if (!hoverPoint) {
        hoverRef.current?.remove();
        hoverRef.current = null;
        return;
      }
      if (hoverRef.current) {
        hoverRef.current.setLatLng([hoverPoint.lat, hoverPoint.lng]);
      } else {
        hoverRef.current = leaflet
          .circleMarker([hoverPoint.lat, hoverPoint.lng], {
            radius: 9,
            color: "#fff",
            weight: 3,
            fillColor: "#f97316",
            fillOpacity: 1,
            interactive: false,
          })
          .addTo(map);
      }
    })();
  }, [hoverPoint]);

  return (
    <div className="relative">
      <div
        ref={elRef}
        style={{ height }}
        className="relative z-0 w-full overflow-hidden rounded-lg border border-slate-200"
      />
      <button
        type="button"
        onClick={() => {
          const next = !satellite;
          setSatellite(next);
          tileRef.current?.setUrl(`https://mt{s}.google.com/vt/lyrs=${next ? "y" : "m"}&x={x}&y={y}&z={z}`);
        }}
        className="absolute right-2 top-2 z-[500] rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-md ring-1 ring-slate-300 hover:bg-white"
      >
        {satellite ? "Street" : "Satellite"}
      </button>
    </div>
  );
}
