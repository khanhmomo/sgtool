// Client-safe geo math: distance along polyline, nearest point, loop detection.
import type { CourseLeg, PositionAnalysis } from "@/types";

const R = 6371000; // meters
const toRad = (d: number) => (d * Math.PI) / 180;

/** Haversine distance in meters */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Ensure a leg's points carry cumulative `d` (km). Mutates a copy. */
export function withCumulative(leg: CourseLeg): CourseLeg {
  if (leg.points.length > 1 && leg.points[leg.points.length - 1].d > 0) return leg;
  const pts = leg.points.map((p) => ({ ...p }));
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += haversineM(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng) / 1000;
    pts[i].d = d;
  }
  return { ...leg, points: pts, distanceKm: d };
}

interface SegHit {
  km: number; // distance along leg at projection point
  distM: number; // meters from query to projection
}

/** Distance in km along the leg for every segment the query point is within `radiusM` of. */
function hitsOnLeg(leg: CourseLeg, lat: number, lng: number, radiusM: number): SegHit[] {
  const pts = leg.points;
  const hits: SegHit[] = [];
  const latScale = 111320;
  const lngScale = 111320 * Math.cos(toRad(lat));

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    // project onto segment in meters
    const ax = 0,
      ay = 0;
    const bx = (b.lng - a.lng) * lngScale;
    const by = (b.lat - a.lat) * latScale;
    const px = (lng - a.lng) * lngScale;
    const py = (lat - a.lat) * latScale;
    const len2 = bx * bx + by * by;
    let t = len2 === 0 ? 0 : (px * bx + py * by) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + bx * t;
    const cy = ay + by * t;
    const distM = Math.hypot(px - cx, py - cy);
    if (distM <= radiusM) {
      const segLenM = haversineM(a.lat, a.lng, b.lat, b.lng);
      hits.push({ km: a.d + (segLenM * t) / 1000, distM });
    }
  }
  return hits;
}

/**
 * Analyze a GPS coordinate against the course.
 * Returns the nearest point plus every course-distance candidate within
 * `radiusM` (loop sections produce multiple candidates).
 */
export function analyzePosition(
  legs: CourseLeg[],
  lat: number,
  lng: number,
  radiusM = 20,
  mergeKm = 0.4
): PositionAnalysis | null {
  if (!legs.length) return null;

  let best: { leg: number; km: number; distM: number } | null = null;
  const candidates: PositionAnalysis["candidates"] = [];

  legs.forEach((rawLeg, legIndex) => {
    const leg = withCumulative(rawLeg);
    const hits = hitsOnLeg(leg, lat, lng, Math.max(radiusM, 200)); // wide scan for nearest
    if (!hits.length) return;
    const legBest = hits.reduce((m, h) => (h.distM < m.distM ? h : m));
    if (!best || legBest.distM < best.distM) {
      best = { leg: legIndex, km: legBest.km, distM: legBest.distM };
    }
    // only near-course hits become candidates
    hits
      .filter((h) => h.distM <= radiusM)
      .forEach((h) => candidates.push({ legIndex, legName: leg.name, sport: leg.sport, km: h.km }));
  });

  if (!best) return null;
  const b = best as { leg: number; km: number; distM: number };

  // cluster candidate km values that are close together along the same leg
  const clustered: PositionAnalysis["candidates"] = [];
  candidates
    .sort((x, y) => x.legIndex - y.legIndex || x.km - y.km)
    .forEach((c) => {
      const last = clustered[clustered.length - 1];
      if (last && last.legIndex === c.legIndex && Math.abs(c.km - last.km) < mergeKm) {
        last.km = (last.km + c.km) / 2; // merge into cluster mean
      } else {
        clustered.push({ ...c });
      }
    });

  return {
    nearestKm: b.km,
    nearestLeg: b.leg,
    distToCourseM: b.distM,
    candidates: clustered,
  };
}
