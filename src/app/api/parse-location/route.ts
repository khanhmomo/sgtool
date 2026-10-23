import { NextResponse } from "next/server";
import { requireUser } from "@/auth";
import { extractCoords, isShortMapLink, parseLatLngText } from "@/lib/coords";
import { resolveShortLink } from "@/lib/resolve-map";

export interface ParseEntry {
  acronym: string;
  url: string;
}

export interface ParseResult {
  acronym: string;
  /** the URL as submitted by the client (used for result matching) */
  url: string;
  /** final URL after redirect resolution, when it changed */
  resolved?: string;
  lat: number | null;
  lng: number | null;
  ok: boolean;
  error?: string;
}

// POST /api/parse-location — batch resolve map links to coordinates
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entries } = (await req.json().catch(() => ({}))) as { entries?: ParseEntry[] };
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }
  if (entries.length > 50) {
    return NextResponse.json({ error: "Too many entries (max 50)" }, { status: 400 });
  }

  const results: ParseResult[] = await Promise.all(
    entries.map(async (e) => {
      const acronym = String(e.acronym || "").toUpperCase().trim();
      const url = String(e.url || "").trim();

      // Direct "lat, lng" text input
      const literal = parseLatLngText(url);
      if (literal) {
        return { acronym, url, lat: literal.lat, lng: literal.lng, ok: true };
      }

      // Try direct extraction first
      let coords = extractCoords(url);

      // Short links need a redirect hop to reveal coordinates
      let resolved: string | undefined;
      let resolutionFailed = false;
      if (!coords && isShortMapLink(url)) {
        const r = await resolveShortLink(url);
        resolved = r.resolved ?? undefined;
        if (r.coords) {
          coords = r.coords;
        } else {
          resolutionFailed = true;
          console.warn(
            `[parse-location] unresolved short link: ${url}` +
              (r.resolved ? ` → ${r.resolved}` : "") +
              (r.networkError ? " (network error)" : "")
          );
        }
      }

      if (coords) {
        return { acronym, url, resolved, lat: coords.lat, lng: coords.lng, ok: true };
      }
      return {
        acronym,
        url,
        resolved,
        lat: null,
        lng: null,
        ok: false,
        error: resolutionFailed
          ? "Couldn't resolve this short link — Google returned no coordinates. Open it in a browser, copy the full Maps URL, or enter lat/lng manually."
          : "We couldn't extract coordinates from this link. Please enter latitude and longitude manually.",
      };
    })
  );

  return NextResponse.json({ results });
}
