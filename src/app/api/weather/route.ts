import { NextResponse } from "next/server";

// GET /api/weather?lat=..&lng=..&start=YYYY-MM-DD&end=YYYY-MM-DD
//   or ?q=City,Country when no coords are known yet (server geocodes once).
// Proxies Open-Meteo (no API key) and caches responses ~1h via Next fetch cache.
export async function GET(req: Request) {
  const url = new URL(req.url);
  let lat = parseFloat(url.searchParams.get("lat") || "");
  let lng = parseFloat(url.searchParams.get("lng") || "");
  const start = url.searchParams.get("start") || "";
  const end = url.searchParams.get("end") || start;
  const q = (url.searchParams.get("q") || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return NextResponse.json({ error: "Missing start date" }, { status: 400 });
  }

  try {
    // Resolve a place name → coords via Open-Meteo geocoding when needed
    let place: string | null = null;
    if ((!isFinite(lat) || !isFinite(lng)) && q) {
      const gr = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
        { next: { revalidate: 86400 } }
      );
      const g = await gr.json().catch(() => null);
      const hit = g?.results?.[0];
      if (hit) {
        lat = hit.latitude;
        lng = hit.longitude;
        place = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
      }
    }

    if (!isFinite(lat) || !isFinite(lng)) {
      return NextResponse.json({ error: "No location for this event" }, { status: 422 });
    }

    // Always surface a text location — reverse-geocode coords when we only
    // have numbers (Nominatim, free, no key; UA header is required)
    if (!place) {
      try {
        const rr = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&accept-language=en`,
          {
            headers: { "User-Agent": "sgtool-weather/1.0" },
            next: { revalidate: 86400 },
          }
        );
        const r = await rr.json().catch(() => null);
        const a = r?.address;
        const name = a?.city || a?.town || a?.village || a?.suburb || a?.municipality || r?.name;
        const country = a?.country;
        // OSM address parts are often local-language (e.g. 恆春鎮) — when they
        // aren't ASCII, fall back to display_name which honors accept-language
        const isAscii = (s?: string) => !s || /^[\x20-\x7E]+$/.test(s);
        if (name && isAscii(name)) {
          place = [name, country].filter(Boolean).join(", ");
        } else if (typeof r?.display_name === "string") {
          // "Township, County, Country" → keep the two most meaningful parts
          const parts = r.display_name.split(",").map((s: string) => s.trim()).filter(Boolean);
          const asciiParts = parts.filter(isAscii);
          if (asciiParts.length) place = asciiParts.slice(0, 2).join(", ") + (country && isAscii(country) ? `, ${country}` : "");
        }
      } catch {
        // leave null — UI falls back to coords
      }
    }

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      start_date: start,
      end_date: /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : start,
      hourly: "temperature_2m,precipitation_probability,weathercode,is_day",
      daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
      timezone: "auto",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 3600 }, // refresh at most once per hour
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Weather service unavailable" }, { status: 502 });
    }
    const data = await res.json();

    // Event dates beyond the ~16-day forecast window return no rows —
    // send an explicit flag so the UI can say "not available yet"
    const days = data?.daily?.time?.length || 0;
    if (!days) {
      return NextResponse.json({ unavailable: true, lat, lng });
    }

    return NextResponse.json({
      lat,
      lng,
      place: place || q || null,
      timezone: data.timezone,
      hourly: data.hourly,
      daily: data.daily,
    });
  } catch {
    return NextResponse.json({ error: "Weather lookup failed" }, { status: 500 });
  }
}
