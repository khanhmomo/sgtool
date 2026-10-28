import clsx, { type ClassValue } from "clsx";
import { wgs84ToGcj02 } from "@/lib/coords";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtSize(bytes: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtKm(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) return "—";
  return `${km.toFixed(1)} km`;
}

export function fmtDistances(ds: number[]): string {
  return ds.length ? ds.map((d) => `${d.toFixed(1)} km`).join(" / ") : "—";
}

// ── Fixed-date rule ─────────────────────────────────────────────────────────
// Event dates/times belong to the EVENT, not the viewer. All calendar-day math
// must produce identical output for every viewer regardless of their timezone:
// parse `YYYY-MM-DD` with a `T00:00:00` suffix (local midnight) and read back
// local date parts — never toISOString()/UTC conversion, which shifts the day
// for viewers east or west of UTC.

/** Inclusive `YYYY-MM-DD` list from start→end (end clamps to start when earlier). */
export function dateRangeYmd(start: string, end?: string, max = 30): string[] {
  const out: string[] = [];
  if (!start) return out;
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end && end >= start ? end : start}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  while (d <= last && out.length < max) {
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function googleMapsUrl(lat: number, lng: number): string {
  // Google renders China in GCJ-02 — convert so the pin lands on the right spot
  const p = wgs84ToGcj02(lat, lng);
  // Maps API search URL — drops an exact pin at the coords on desktop AND
  // inside the mobile app (`loc:` breaks the app: it searches the literal
  // text instead of parsing a coordinate).
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

/** South Korea bounding box — Google Maps has poor coverage there; Naver is standard. */
export function isInSouthKorea(lat: number, lng: number): boolean {
  return lat >= 33.0 && lat <= 38.7 && lng >= 124.5 && lng <= 132.0;
}

/** Naver Maps pin — `pinType=site` drops a real marker at the coords; the mobile
 *  share URL redirects to the full map on desktop. */
export function naverMapsUrl(lat: number, lng: number): string {
  return `https://m.map.naver.com/map.naver?lng=${lng}&lat=${lat}&dLevel=14&pinType=site`;
}

/** Best map link for a coordinate: Naver for South Korea, Google elsewhere. */
export function spotMapUrl(lat: number, lng: number): string {
  return isInSouthKorea(lat, lng) ? naverMapsUrl(lat, lng) : googleMapsUrl(lat, lng);
}

export function isImageMime(mime: string): boolean {
  return /^image\/(png|jpe?g|webp|gif|avif)$/i.test(mime);
}

export function isPdfMime(mime: string): boolean {
  return /pdf/i.test(mime);
}
