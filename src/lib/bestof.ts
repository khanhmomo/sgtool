import type { BestofInfo } from "@/types";

/**
 * Resolve a sportograf.com event link to its Juicebox best-of gallery.
 * e.g. https://www.sportograf.com/en/event/26335 → fetches
 * https://www.sportograf.com/bestof/26335/config.xml and returns the
 * image URLs. Images stay on sportograf's CDN — we only store URLs.
 * Returns null when the link is invalid or has no best-of gallery.
 */
export async function fetchBestof(url: string): Promise<BestofInfo | null> {
  const m = url.match(/sportograf\.com\/(?:[a-z]{2}\/)?(?:event|bestof)\/(\d+)/i);
  if (!m) return null;
  const id = m[1];

  const base = `https://www.sportograf.com/bestof/${id}`;
  const res = await fetch(`${base}/config.xml`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res || !res.ok) return null;

  const xml = await res.text();
  const images = [...xml.matchAll(/imageURL="([^"]+)"/g)]
    .map((x) => `${base}/${x[1].replace(/\\/g, "/")}`)
    .filter((u) => u.includes("/images/"));
  if (!images.length) return null;

  return { link: `https://www.sportograf.com/en/event/${id}`, images };
}

/** Swap the full-size path for the thumbnail path of a best-of image. */
export function bestofThumb(url: string): string {
  return url.replace("/images/", "/thumbs/");
}
