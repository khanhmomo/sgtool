"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Droplets,
  MapPin,
} from "lucide-react";

/* ── WMO weather-code → icon + label (Apple-style ordering) ─────────── */
type Wx = { label: string; day: typeof Sun; night?: typeof Sun };
const WX: Record<number, Wx> = {
  0: { label: "Clear", day: Sun, night: Moon },
  1: { label: "Mostly Clear", day: CloudSun, night: CloudMoon },
  2: { label: "Partly Cloudy", day: CloudSun, night: CloudMoon },
  3: { label: "Cloudy", day: Cloud, night: Cloud },
  45: { label: "Fog", day: CloudFog, night: CloudFog },
  48: { label: "Rime Fog", day: CloudFog, night: CloudFog },
  51: { label: "Light Drizzle", day: CloudDrizzle },
  53: { label: "Drizzle", day: CloudDrizzle },
  55: { label: "Heavy Drizzle", day: CloudDrizzle },
  56: { label: "Freezing Drizzle", day: CloudDrizzle },
  57: { label: "Freezing Drizzle", day: CloudDrizzle },
  61: { label: "Light Rain", day: CloudRain },
  63: { label: "Rain", day: CloudRain },
  65: { label: "Heavy Rain", day: CloudRain },
  66: { label: "Freezing Rain", day: CloudRain },
  67: { label: "Freezing Rain", day: CloudRain },
  71: { label: "Light Snow", day: CloudSnow },
  73: { label: "Snow", day: CloudSnow },
  75: { label: "Heavy Snow", day: CloudSnow },
  77: { label: "Snow Grains", day: CloudSnow },
  80: { label: "Light Showers", day: CloudRain },
  81: { label: "Showers", day: CloudRain },
  82: { label: "Heavy Showers", day: CloudRain },
  85: { label: "Snow Showers", day: CloudSnow },
  86: { label: "Snow Showers", day: CloudSnow },
  95: { label: "Thunderstorm", day: CloudLightning },
  96: { label: "T-storm + Hail", day: CloudLightning },
  99: { label: "T-storm + Hail", day: CloudLightning },
};
const wx = (code: number): Wx => WX[code] ?? { label: "Mixed", day: Cloudy, night: Cloud };

interface Hourly {
  time: string[]; // ISO local
  temperature_2m: number[];
  precipitation_probability: number[];
  weathercode: number[];
  is_day: number[];
}
interface Daily {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
}
interface Props {
  /** Event day keys YYYY-MM-DD to render (each gets its own Apple-style card) */
  dates: string[];
  lat?: number | null;
  lng?: number | null;
  q?: string; // place name fallback when coords unknown
  timezone?: string;
}

/** Apple-Weather-style hourly forecast per event day — °C/°F toggle. */
export default function WeatherForecast({ dates, lat, lng, q }: Props) {
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [data, setData] = useState<{ hourly: Hourly; daily: Daily } | null>(null);
  const [locLabel, setLocLabel] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  const start = dates[0];
  const end = dates[dates.length - 1];
  const hasLoc = (lat != null && lng != null) || !!q;
  // Single serialized key → dep array is exactly one primitive, always stable
  const key = `${lat ?? ""}|${lng ?? ""}|${q ?? ""}|${start ?? ""}|${end ?? ""}|${hasLoc}`;
  useEffect(() => {
    if (!start || !hasLoc) return;
    const p = new URLSearchParams({ start, end: end || start });
    if (lat != null && lng != null) {
      p.set("lat", String(lat));
      p.set("lng", String(lng));
    } else if (q) {
      p.set("q", q);
    }
    fetch(`/api/weather?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.daily?.time?.length) {
          setData({ hourly: d.hourly, daily: d.daily });
          setLocLabel(
            d.place || (d.lat != null ? `${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}` : null)
          );
          setState("ready");
        } else {
          setState("empty");
        }
      })
      .catch(() => setState("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const t = (c: number) => (unit === "C" ? Math.round(c) : Math.round((c * 9) / 5 + 32));

  // hourly grouped by local date for quick lookup
  const byDay = useMemo(() => {
    const map: Record<string, { hour: number; temp: number; rain: number; code: number; isDay: boolean }[]> = {};
    if (!data) return map;
    data.hourly.time.forEach((iso, i) => {
      const [date, hh] = iso.split("T");
      (map[date] ||= []).push({
        hour: parseInt(hh.slice(0, 2), 10),
        temp: data.hourly.temperature_2m[i],
        rain: data.hourly.precipitation_probability?.[i] ?? 0,
        code: data.hourly.weathercode[i],
        isDay: data.hourly.is_day?.[i] === 1,
      });
    });
    return map;
  }, [data]);

  const dayMeta = (date: string) => {
    const i = data?.daily.time.indexOf(date) ?? -1;
    if (i < 0 || !data) return null;
    return {
      code: data.daily.weathercode[i],
      hi: data.daily.temperature_2m_max[i],
      lo: data.daily.temperature_2m_min[i],
      rain: data.daily.precipitation_probability_max?.[i] ?? 0,
    };
  };

  const dayName = (date: string, i: number) => {
    const d = new Date(`${date}T12:00:00`);
    return i === 0 ? `Day 1 · ${d.toLocaleDateString("en-US", { weekday: "short" })}`
      : d.toLocaleDateString("en-US", { weekday: "long" });
  };

  if (!hasLoc || state === "empty") {
    return (
      <div className="rounded-xl bg-gradient-to-b from-slate-500 to-slate-600 p-4 text-center text-sm text-white/80">
        Forecast not published yet for these dates — check again closer to race day.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* location + unit toggle row */}
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{locLabel ?? q ?? "Locating…"}</span>
        </p>
        <div className="flex overflow-hidden rounded-lg bg-slate-200/70 text-[11px] font-bold">
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-2.5 py-1 ${unit === u ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-800"}`}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>

      {state === "loading" && (
        <div className="rounded-xl bg-gradient-to-b from-sky-500 to-blue-600 p-6 text-center text-sm text-white/80">
          Loading forecast…
        </div>
      )}

      {state === "error" && (
        <div className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">
          Couldn’t load the forecast.
        </div>
      )}

      {state === "ready" && data && dates.map((date, di) => {
        const meta = dayMeta(date);
        const hours = byDay[date] || [];
        const DayIcon = meta ? (wx(meta.code).day) : Cloud;
        return (
          <div
            key={date}
            className="overflow-hidden rounded-xl bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md"
          >
            {/* daily header */}
            <div className="flex items-center gap-3 px-4 pt-3">
              <DayIcon size={26} className="text-yellow-300 drop-shadow" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {dayName(date, di)}
                  <span className="ml-2 font-normal text-white/70">
                    {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </p>
                <p className="text-xs text-white/70">{meta ? wx(meta.code).label : "—"}</p>
              </div>
              {meta && (
                <div className="text-right text-sm font-semibold">
                  <span className="text-white/95">{t(meta.hi)}°</span>
                  <span className="ml-1.5 text-white/60">{t(meta.lo)}°</span>
                  {meta.rain > 0 && (
                    <p className="flex items-center justify-end gap-0.5 text-[11px] font-normal text-sky-200">
                      <Droplets size={10} /> {meta.rain}%
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 24h strip */}
            {hours.length ? (
              <div className="flex gap-0 overflow-x-auto px-2 pb-3 pt-2 [scrollbar-width:none]">
                {hours.map((h, i) => {
                  const w = wx(h.code);
                  const HIcon = (h.isDay ? w.day : w.night) || w.day;
                  return (
                    <div key={i} className="flex w-12 shrink-0 flex-col items-center gap-1 py-1 text-[11px]">
                      <span className="text-white/70">{i === 0 ? "Now" : `${h.hour}`}</span>
                      <HIcon size={16} className={h.isDay ? "text-yellow-200" : "text-sky-200"} />
                      <span className="flex h-3 items-center gap-0.5 text-[9px] text-sky-200">
                        {h.rain >= 20 && (
                          <>
                            <Droplets size={8} />
                            {h.rain}
                          </>
                        )}
                      </span>
                      <span className="font-semibold">{t(h.temp)}°</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 pb-3 pt-2 text-xs text-white/60">No hourly data for this day yet.</p>
            )}
          </div>
        );
      })}
      {/* attribution intentionally hidden per design */}
    </div>
  );
}
