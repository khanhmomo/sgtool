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
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

export function isImageMime(mime: string): boolean {
  return /^image\/(png|jpe?g|webp|gif|avif)$/i.test(mime);
}

export function isPdfMime(mime: string): boolean {
  return /pdf/i.test(mime);
}
