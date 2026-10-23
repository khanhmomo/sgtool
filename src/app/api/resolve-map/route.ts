import { NextResponse } from "next/server";
import { extractCoords, isShortMapLink, parseLatLngText } from "@/lib/coords";
import { resolveShortLink } from "@/lib/resolve-map";

// GET /api/resolve-map?url=… — public (photographer site) resolver for map links → coords.
// Restricted to map link shapes / literal lat,lng so it can't be used as an open proxy.
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") || "";

  const literal = parseLatLngText(url);
  if (literal) return NextResponse.json({ lat: literal.lat, lng: literal.lng });

  const direct = extractCoords(url);
  if (direct) return NextResponse.json({ lat: direct.lat, lng: direct.lng });

  if (!isShortMapLink(url)) {
    return NextResponse.json({ error: "No coordinates found" }, { status: 404 });
  }

  const r = await resolveShortLink(url);
  if (r.coords) return NextResponse.json({ lat: r.coords.lat, lng: r.coords.lng, resolved: r.resolved });

  // Short link gave no coords (place URLs embed coords only in-page JS that
  // isn't in the lightweight body Google serves) — geocode the venue name.
  // Try progressively looser queries: "Venue, City, Country" often fails when
  // the venue sits in a neighboring city, so fall back to "Venue, Country".
  const q = new URL(req.url).searchParams.get("q");
  if (q) {
    const parts = q.split(",").map((x) => x.trim()).filter(Boolean);
    const queries = [q];
    if (parts.length > 2) queries.push(`${parts[0]}, ${parts[parts.length - 1]}`);
    if (parts.length) queries.push(parts[0]);
    for (const query of queries) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { "User-Agent": "sportograf-tl-tool/1.0" }, signal: AbortSignal.timeout(8000) }
        );
        const hits = (await res.json()) as { lat: string; lon: string }[];
        const h = hits?.[0];
        if (h) {
          const lat = parseFloat(h.lat);
          const lng = parseFloat(h.lon);
          if (isFinite(lat) && isFinite(lng)) return NextResponse.json({ lat, lng });
        }
      } catch {
        /* try next query */
      }
    }
  }
  return NextResponse.json({ error: "Couldn't resolve link" }, { status: 404 });
}
