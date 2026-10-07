import { XMLParser } from "fast-xml-parser";
import type { Course, CourseLeg, CoursePoint, Sport } from "@/types";
import { sportOf } from "@/lib/design";
import { haversineM } from "@/lib/geo";

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return isFinite(n) ? n : null;
}

function buildLeg(name: string, rawPts: { lat: number; lng: number }[]): CourseLeg | null {
  if (rawPts.length < 2) return null;
  // cap point count so Mongo documents stay small and the map stays fast
  const MAX = 1500;
  const step = Math.max(1, Math.ceil(rawPts.length / MAX));
  const pts: CoursePoint[] = [];
  let d = 0;
  let prev: { lat: number; lng: number } | null = null;
  for (let i = 0; i < rawPts.length; i += step) {
    const p = rawPts[i];
    if (prev) d += haversineM(prev.lat, prev.lng, p.lat, p.lng) / 1000;
    pts.push({ lat: p.lat, lng: p.lng, d });
    prev = p;
  }
  const last = rawPts[rawPts.length - 1];
  if (prev && (prev.lat !== last.lat || prev.lng !== last.lng)) {
    d += haversineM(prev.lat, prev.lng, last.lat, last.lng) / 1000;
    pts.push({ lat: last.lat, lng: last.lng, d });
  }
  const sport: Sport = sportOf(name);
  return { name: name || "Course", sport, points: pts, distanceKm: d };
}

/** Parse GPX XML text into a Course. Throws with a user-facing message on failure. */
export function parseGpx(xmlText: string, fileName: string): Course {
  let doc: Record<string, unknown>;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
    });
    doc = parser.parse(xmlText) as Record<string, unknown>;
  } catch {
    throw new Error("Unable to parse GPX file. Please check that this is a valid GPX file.");
  }

  const gpx = doc?.gpx as Record<string, unknown> | undefined;
  if (!gpx) {
    throw new Error("Unable to parse GPX file. Please check that this is a valid GPX file.");
  }

  const legs: CourseLeg[] = [];

  // Tracks — each <trk> becomes one leg, <trkseg> points concatenated.
  for (const trk of asArray(gpx.trk as Record<string, unknown> | Record<string, unknown>[])) {
    const name = String((trk as Record<string, unknown>).name ?? "") || `Track ${legs.length + 1}`;
    const rawPts: { lat: number; lng: number }[] = [];
    for (const seg of asArray((trk as Record<string, unknown>).trkseg)) {
      for (const pt of asArray((seg as Record<string, unknown>)?.trkpt)) {
        const rec = pt as Record<string, unknown>;
        const lat = num(rec["@_lat"]);
        const lng = num(rec["@_lon"]);
        if (lat !== null && lng !== null) rawPts.push({ lat, lng });
      }
    }
    const leg = buildLeg(name, rawPts);
    if (leg) legs.push(leg);
  }

  // Routes — each <rte> becomes one leg if no track covered it.
  for (const rte of asArray(gpx.rte as Record<string, unknown> | Record<string, unknown>[])) {
    const name = String((rte as Record<string, unknown>).name ?? "") || `Route ${legs.length + 1}`;
    const rawPts: { lat: number; lng: number }[] = [];
    for (const pt of asArray((rte as Record<string, unknown>).rtept)) {
      const rec = pt as Record<string, unknown>;
      const lat = num(rec["@_lat"]);
      const lng = num(rec["@_lon"]);
      if (lat !== null && lng !== null) rawPts.push({ lat, lng });
    }
    const leg = buildLeg(name, rawPts);
    if (leg) legs.push(leg);
  }

  if (!legs.length) {
    throw new Error("No track or route points found in this GPX file.");
  }

  return { legs, fileName, updatedAt: new Date().toISOString() };
}
