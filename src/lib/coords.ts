// Google Maps link coordinate extraction. Client-safe pure functions.

export interface ParsedCoords {
  lat: number;
  lng: number;
}

// ── GCJ-02 → WGS-84 ──────────────────────────────────────────────────────────
// Google Maps data inside China uses the GCJ-02 ("Mars") datum, which is offset
// ~500m from WGS-84 (used by OSM/GPX). Convert extracted coords to WGS-84 so
// markers align with Leaflet/OSM tiles and course analysis stays correct.

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLon(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

function delta(lat: number, lng: number): { dLat: number; dLon: number } {
  const a = 6378245.0;
  const ee = 0.006693421622965943;
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLon = transformLon(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { dLat, dLon };
}

/** Convert GCJ-02 to WGS-84. Pass-through for points outside China. */
export function gcj02ToWgs84(lat: number, lng: number): ParsedCoords {
  if (outOfChina(lat, lng)) return { lat, lng };
  const { dLat, dLon } = delta(lat, lng);
  return { lat: lat - dLat, lng: lng - dLon };
}

/** Convert WGS-84 to GCJ-02 — use for outbound Google Maps links inside China. */
export function wgs84ToGcj02(lat: number, lng: number): ParsedCoords {
  if (outOfChina(lat, lng)) return { lat, lng };
  const { dLat, dLon } = delta(lat, lng);
  return { lat: lat + dLat, lng: lng + dLon };
}

/** Extract lat/lng from a Google Maps (or generic geo) URL string. */
export function extractCoords(url: string): ParsedCoords | null {
  if (!url) return null;
  const s = decodeURIComponent(url.trim());

  // geo: URIs are already WGS-84 — no GCJ-02 conversion
  const geo = s.match(/geo:(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (geo) {
    const lat = parseFloat(geo[1]);
    const lng = parseFloat(geo[2]);
    if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // Google-sourced patterns — inside China these are GCJ-02, normalize to WGS-84
  const patterns: RegExp[] = [
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // .../@31.23,121.47,15z
    /\/maps\/(?:search|dir)\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/, // /maps/search/31.23,121.47
    /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // ?q=lat,lng
    /[?&]query=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /[?&]center=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // place data !3d LAT !4d LNG
  ];

  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return gcj02ToWgs84(lat, lng);
      }
    }
  }
  return null;
}

/** True if the link is a short share link that must be resolved server-side. */
export function isShortMapLink(url: string): boolean {
  return /(maps\.app\.goo\.gl|goo\.gl\/maps|share\.google)/i.test(url.trim());
}

/** Extract raw "lat, lng" text the user may have typed directly. */
export function parseLatLngText(text: string): ParsedCoords | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
