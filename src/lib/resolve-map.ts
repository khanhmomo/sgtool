// Server-side short map link resolution (maps.app.goo.gl / goo.gl/maps / share.google).
import { extractCoords } from "./coords";
import type { ParsedCoords } from "./coords";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Scan an HTML body for a Google Maps URL or raw !3d/!4d coordinate pairs. */
function coordsFromBody(body: string): ParsedCoords | null {
  // normalize common JS-escape forms found in embedded data
  const norm = body
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .slice(0, 600_000);

  // an embedded google maps URL (JS redirect / meta refresh pages)
  const link = norm.match(/https?:\/\/[^"'<>\s]*google\.[^"'<>\s]*\/maps[^"'<>\s]*/);
  if (link) {
    const c = extractCoords(link[0]);
    if (c) return c;
  }
  // raw coordinate pairs embedded in page data
  for (const re of [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /center=(-?\d+\.\d+)[,%]2?C?(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /"(-?\d+\.\d+)",\s*"(-?\d+\.\d+)"/,
  ]) {
    const m = norm.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

export async function resolveShortLink(
  url: string
): Promise<{ resolved: string | null; coords: ParsedCoords | null; networkError?: boolean }> {
  const headers = {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml",
    // skips Google's EU consent interstitial
    Cookie: "CONSENT=YES+cb.20210720-07-p0.en+FX+410",
  };

  // strategy: read the Location header from a redirect without following it
  const manualLocation = async (
    target: string,
    method: "HEAD" | "GET"
  ): Promise<{ resolved: string; coords: ParsedCoords | null } | null> => {
    try {
      const res = await fetch(target, {
        method,
        redirect: "manual",
        headers,
        signal: AbortSignal.timeout(10000),
      });
      const loc = res.headers.get("location");
      if (!loc) return null;
      const resolved = new URL(loc, target).href;
      return { resolved, coords: extractCoords(resolved) };
    } catch {
      return null;
    }
  };

  // 1) Google answers HEAD on short links with a real 302 + Location header
  const head = await manualLocation(url, "HEAD");
  if (head?.coords) return { resolved: head.resolved, coords: head.coords };

  // 2) the _imcp=1 parameter forces a redirect response instead of the JS interstitial
  const imcp = await manualLocation(
    url + (url.includes("?") ? "&" : "?") + "_imcp=1",
    "GET"
  );
  if (imcp?.coords) return { resolved: imcp.resolved, coords: imcp.coords };

  // 3) GET followed — may redirect normally or return a page embedding the target
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const resolved = res.url || head?.resolved || imcp?.resolved || null;
    const fromUrl = resolved ? extractCoords(resolved) : null;
    if (fromUrl) return { resolved, coords: fromUrl };

    const body = await res.text().catch(() => "");
    return { resolved, coords: coordsFromBody(body) };
  } catch {
    return { resolved: head?.resolved ?? imcp?.resolved ?? null, coords: null, networkError: true };
  }
}
