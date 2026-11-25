import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import { Children, Fragment, cloneElement, isValidElement } from "react";
import type { EventDTO, HyroxDayPlan, TacticDay, TacticRow } from "@/types";

const C = {
  ink: "#0f172a",
  sub: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  head: "#1e293b",
  yellow: "#FFED00",
  blue: "#2563eb",
  blueSoft: "#eff6ff",
  row: "#f8fafc",
};

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 9, fontFamily: "Helvetica", color: C.ink, backgroundColor: "#ffffff" },
  hero: { backgroundColor: C.head, padding: "10 24 8 24", borderBottomWidth: 3, borderBottomColor: C.blue },
  heroTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  heroMeta: { fontSize: 8, color: "#cbd5e1", marginTop: 3 },
  body: { padding: "8 24 12 24" },
  dayCard: { borderWidth: 1, borderColor: C.line, borderRadius: 7, marginBottom: 8, padding: "7 10 8 10" },
  dayTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.ink },
  callChip: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.blue, backgroundColor: C.blueSoft, borderRadius: 3, padding: "2 6" },
  dayNote: { fontSize: 8.5, color: C.sub, marginTop: 5 },
  shiftPill: { alignSelf: "flex-start", fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink, backgroundColor: C.yellow, borderRadius: 3, padding: "2 7", marginTop: 5, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 5, marginTop: 2, marginBottom: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.line },
  thRow: { flexDirection: "row", backgroundColor: C.head, borderTopLeftRadius: 4, borderTopRightRadius: 4, paddingVertical: 3.5, minHeight: 16, alignItems: "center" },
  thCell: { paddingHorizontal: 7 },
  thTxt: { color: "#e2e8f0", fontSize: 6.8, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  td: { paddingVertical: 4.5, paddingHorizontal: 7, borderRightWidth: 0.6, borderRightColor: C.line },
  tdTxt: { fontSize: 8.5 },
  station: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  bold: { fontFamily: "Helvetica-Bold", color: C.ink },
  dim: { color: C.sub, fontSize: 8 },
  tiny: { fontSize: 7.5, color: C.sub },
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.sub, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 6, marginBottom: 2 },
  arrow: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.blue, textAlign: "center" },
  groupName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: C.blue },
  footer: { marginTop: 6, paddingTop: 4, borderTopWidth: 0.6, borderTopColor: C.line, fontSize: 6.5, color: C.faint },
});

const normStation = (n: string) => (n || "").replace(/\s*\(optional\)\s*/gi, "").trim();
/** Strip markdown syntax — notes are written in markdown but the PDF is plain text */
const plain = (t: string) =>
  (t || "")
    .replace(/[#*_`>\[\]]/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\((https?:[^)]+)\)/g, "$1")
    // strip emoji + variation selectors the PDF's built-in font cannot render
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
const hasBreakSched = (d: HyroxDayPlan) =>
  (d.tactic.breaks || []).some((t) =>
    Object.values(t?.rows || {}).some((r) => (r || []).some((b) => (b.start && b.end) || b.cover))
  );

const join = (a?: string[] | string) => Array.isArray(a) ? a.filter(Boolean).join(", ") : (a || "");
const lines = (a?: string[] | string) => Array.isArray(a) ? a.filter(Boolean).join("\n") : (a || "");

/** Pull "lat,lng" out of a Google-Maps-style link, else short display text */
const gpsLabel = (mapLink?: string) => {
  const l = mapLink || "";
  const q = l.match(/query=(-?[\d.]+),(-?[\d.]+)/) || l.match(/@(-?[\d.]+),(-?[\d.]+)/) || l.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return `${parseFloat(q[1]).toFixed(4)}, ${parseFloat(q[2]).toFixed(4)}`;
  return l.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 28);
};

const stationOrder = ["skierg", "sled push", "sled pull", "burpees", "rowing", "farmers carry", "sandbag lunges", "wall ball", "finish", "hero wall", "ls arch"];
const stationNum = (n: string) => {
  const i = stationOrder.indexOf(normStation(n).toLowerCase());
  return i >= 0 && i < 8 ? `${i + 1}. ` : "";
};

function Col({ w, children, head, last }: { w: string; children: React.ReactNode; head?: boolean; last?: boolean }) {
  const styled = Children.map(children, (ch) =>
    isValidElement(ch)
      ? cloneElement(ch as React.ReactElement<{ style?: unknown }>, {
          style: [head ? s.thTxt : s.tdTxt, (ch.props as { style?: unknown }).style],
        })
      : ch
  );
  if (head) return <View style={[{ width: w }, s.thCell]}>{styled}</View>;
  return <View style={[{ width: w }, s.td, last ? { borderRightWidth: 0 } : {}]}>{styled}</View>;
}

function HyroxShiftTable({
  stations,
}: {
  stations: { station: string; photographers: string[]; ls?: string[]; cover?: string[]; breaks?: { start: string; end: string }[] | string; note?: string }[];
}) {
  const breakFor = (st: { station: string; breaks?: { start: string; end: string }[] | string }) => {
    // per-station break windows (station table Break column) — may be a legacy string.
    // stations 1-3 schedule-table rows are shown separately in the Break schedule section.
    return Array.isArray(st.breaks)
      ? st.breaks.filter((b) => b.start && b.end).map((b) => `${b.start}–${b.end}`).join("\n")
      : st.breaks || "";
  };
  const rows = stations.filter((st) => {
    const n = normStation(st.station).toLowerCase();
    const empty = !join(st.photographers) && !join(st.ls) && !join(st.cover) && !(st.note || "").trim();
    return !(n === "burpees" && empty);
  });
  return (
    <View style={s.table}>
      <View style={s.thRow}>
        <Col w="20%" head><Text>Station</Text></Col>
        <Col w="30%" head><Text>Photographers</Text></Col>
        <Col w="15%" head><Text>LS crew</Text></Col>
        <Col w="15%" head><Text>Cover</Text></Col>
        <Col w="20%" head last><Text>Break</Text></Col>
      </View>
      {rows.map((st, i) => (
        <View key={i} wrap={false} style={[s.tr, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <Col w="20%"><Text style={s.station}>{stationNum(st.station)}{normStation(st.station)}</Text></Col>
          <Col w="30%"><Text>{lines(st.photographers)}</Text></Col>
          <Col w="15%"><Text style={s.dim}>{lines(st.ls)}</Text></Col>
          <Col w="15%"><Text style={s.dim}>{lines(st.cover)}</Text></Col>
          <Col w="20%" last><Text style={s.tiny}>{breakFor(st)}</Text></Col>
        </View>
      ))}
    </View>
  );
}

function SpotTable({ rows, photogs }: { rows: TacticRow[]; photogs: { acronym: string; name: string }[] }) {
  const nameOf = (acr: string) => photogs.find((p) => p.acronym === acr.trim())?.name || "";
  const personLines = (acrList: string, lsList: string) => {
    const out: string[] = [];
    (acrList || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((a) => {
      out.push(nameOf(a) ? `${a} ${nameOf(a)}` : a);
    });
    (lsList || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((a) => {
      out.push(`${a} ${nameOf(a) ? `${nameOf(a)} ` : ""}(LS)`);
    });
    return out.join("\n");
  };
  return (
    <View style={s.table}>
      <View style={s.thRow}>
        <Col w="17%" head><Text>Spot</Text></Col>
        <Col w="28%" head><Text>Photographers</Text></Col>
        <Col w="11%" head><Text>Arrival</Text></Col>
        <Col w="11%" head><Text>Finish</Text></Col>
        <Col w="15%" head><Text>GPS</Text></Col>
        <Col w="18%" head last><Text>Note</Text></Col>
      </View>
      {rows.map((r, i) => {
        const gps = gpsLabel(r.mapLink);
        return (
          <View key={r.id || i} wrap={false} style={[s.tr, r.color ? { backgroundColor: r.color } : {}, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
            <Col w="17%"><Text style={s.station}>{r.spot}</Text></Col>
            <Col w="28%"><Text style={s.bold}>{personLines(r.photographer, r.ls)}</Text></Col>
            <Col w="11%"><Text style={s.bold}>{r.arrival}</Text></Col>
            <Col w="11%"><Text style={s.bold}>{r.finish || ""}</Text></Col>
            <Col w="15%"><Text>{r.mapLink ? <Link src={r.mapLink} style={{ color: C.ink, textDecoration: "none", fontFamily: "Helvetica-Bold" }}>{gps}</Link> : ""}</Text></Col>
            <Col w="18%" last><Text style={[s.tiny, s.bold]}>{plain(r.note)}</Text></Col>
          </View>
        );
      })}
    </View>
  );
}

const fmtD = (d: string) => {
  if (!d) return "";
  const dt = new Date(`${d.slice(0, 10)}T12:00:00`);
  return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

export function TacticPdf({ event, onlyDate, dayNum }: { event: EventDTO; onlyDate?: string; dayNum?: number }) {
  const start = event.date?.slice(0, 10) || "";
  const end = (event.endDate || "").slice(0, 10);
  const hyroxDays = (event.hyrox || []).filter((d) =>
    // a date-scoped export renders that day regardless of publish state (TL-only route);
    // the full export stays limited to published days inside the event range
    onlyDate ? d.date === onlyDate : d.published && (!start || (d.date >= start && (!end || d.date <= end)))
  );
  const pubDays = (event.tacticDays || []).filter((d) => d.published);
  const legacyRows = !pubDays.length && event.tacticPublished ? event.tactic || [] : [];
  const when = [fmtD(start), end && end !== start ? fmtD(end) : ""].filter(Boolean).join(" – ");
  const tl = [event.ownerAcronym, ...(event.teamLeaderInfos || []).map((t) => t.acronym)].filter(Boolean).join(" · ");

  return (
    <Document title={`${event.name} — Tactic`} author="Sportograf TL">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.hero}>
          <Text style={s.heroTitle}>{event.name} — Tactic{dayNum ? ` · DAY ${dayNum}` : ""}</Text>
          <Text style={s.heroMeta}>{[when, event.location, event.country, tl && `TL: ${tl}`].filter(Boolean).join("   ·   ")}</Text>
        </View>

        <View style={s.body}>
          {hyroxDays.map((d: HyroxDayPlan, di: number) => (
            <Fragment key={d.date}>
            <View style={s.dayCard} break={di > 0}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={s.dayTitle}>{fmtD(d.date)}</Text>
                {d.callTime ? <Text style={s.callChip}>Call {d.callTime}</Text> : null}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                {(d.tactic.shifts || []).map((stns, si) => (
                  <View key={si} style={{ width: d.tactic.shifts.length > 1 ? "48.5%" : "100%" }}>
                    {d.tactic.shifts.length > 1 && <Text style={s.shiftPill}>Shift {si + 1}</Text>}
                    <HyroxShiftTable stations={stns} />
                  </View>
                ))}
              </View>
            </View>
            {((d.tactic.switchGroups || []).length > 0 || hasBreakSched(d)) && (
            <View style={[s.dayCard, { marginTop: 8 }]} break>
              {(d.tactic.switchGroups || []).length > 0 && (
                <View>
                  <Text style={s.sectionLabel}>Switch — move to new station · new card</Text>
                  <View style={s.table}>
                    <View style={s.thRow}>
                      <Col w="13%" head><Text>Group</Text></Col>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <Col key={n} w="10.9%" head last={n === 8}><Text>{n === 1 ? "1st" : `> ${n}`}</Text></Col>
                      ))}
                    </View>
                    {d.tactic.switchGroups.map((g, gi) => {
                      const people = g.photographers.filter(Boolean).slice(0, 8);
                      return (
                        <View key={g.id} wrap={false} style={[s.tr, gi === d.tactic.switchGroups.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                          <Col w="13%"><Text style={s.groupName}>{g.name}</Text></Col>
                          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <Col key={i} w="10.9%" last={i === 7}>
                              <Text style={s.dim}>{people[i] ? (i === 0 ? people[i] : `> ${people[i]}`) : ""}</Text>
                            </Col>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                  {d.tactic.switchNote ? <Text style={s.tiny}>{plain(d.tactic.switchNote)}</Text> : null}
                </View>
              )}
              {(() => {
                const perShift = (d.tactic.breaks || []).map((t) => t?.rows || {});
                const stations: string[] = [];
                perShift.forEach((rows) => Object.keys(rows).forEach((st) => {
                  const kept = (rows[st] || []).some((b) => (b.start && b.end) || b.cover);
                  if (kept && !stations.includes(st)) stations.push(st);
                }));
                if (!stations.length) return null;
                return (
                  <View>
                    <Text style={s.sectionLabel}>Break schedule · stations 1–3</Text>
                    {perShift.map((rows, si) => {
                      const windows: string[] = [];
                      const table = stations.map((st) => {
                        const m: Record<string, string> = {};
                        (rows[st] || []).forEach((b) => {
                          if (b.start && b.end) {
                            const k = `${b.start}–${b.end}`;
                            if (!windows.includes(k)) windows.push(k);
                            m[k] = b.cover || "";
                          } else if (b.cover) m.__self = b.cover;
                        });
                        return { st, m };
                      });
                      const hasTimed = windows.length > 0;
                      const hasRows = table.some((r) => Object.keys(r.m).length > 0);
                      if (!hasRows) return null;
                      const colW = `${(90 / Math.max(1, windows.length)).toFixed(2)}%`;
                      return (
                        <View key={si}>
                          {perShift.length > 1 && <Text style={s.shiftPill}>Shift {si + 1}</Text>}
                          <View style={s.table}>
                            <View style={s.thRow}>
                              <Col w="10%" head><Text>Station</Text></Col>
                              {hasTimed
                                ? windows.map((w, i) => (
                                    <Col key={w} w={colW} head last={i === windows.length - 1}><Text>{w}</Text></Col>
                                  ))
                                : <Col w="90%" head last><Text>Break</Text></Col>}
                            </View>
                            {table.map(({ st, m }, ri) => (
                              <View key={st} wrap={false} style={[s.tr, ri === table.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                                <Col w="10%"><Text style={s.station}>{st}</Text></Col>
                                {hasTimed
                                  ? windows.map((w, i) => (
                                      <Col key={w} w={colW} last={i === windows.length - 1}>
                                        <Text style={s.dim}>{m[w] || ""}</Text>
                                      </Col>
                                    ))
                                  : <Col w="90%" last><Text style={s.dim}>{m.__self || ""}</Text></Col>}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                    {d.tactic.breakNote ? <Text style={s.tiny}>{plain(d.tactic.breakNote)}</Text> : null}
                  </View>
                );
              })()}
            </View>
            )}
            </Fragment>
          ))}

          {hyroxDays.length === 0 && pubDays.map((d: TacticDay) => (
            <View key={d.date || d.label} style={s.dayCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={s.dayTitle}>{d.label || fmtD(d.date)}</Text>
                {d.callTime ? <Text style={s.callChip}>Call {d.callTime}</Text> : null}
              </View>
              {(d.mainName || (d.categories?.length ?? 0) > 0) && (
                <Text style={s.sectionLabel}>{d.mainName || "Race"}</Text>
              )}
              <SpotTable rows={d.rows} photogs={event.photographers || []} />
              {(d.categories || []).filter((c) => c.rows.length).map((c) => (
                <View key={c.id}>
                  <Text style={s.sectionLabel}>{c.name}</Text>
                  <SpotTable rows={c.rows} photogs={event.photographers || []} />
                </View>
              ))}
            </View>
          ))}

          {hyroxDays.length === 0 && pubDays.length === 0 && legacyRows.length > 0 && (
            <View style={s.dayCard}>
              <SpotTable rows={legacyRows} photogs={event.photographers || []} />
            </View>
          )}

          {hyroxDays.length === 0 && pubDays.length === 0 && legacyRows.length === 0 && (
            <Text style={s.dayNote}>No published tactic yet.</Text>
          )}

          <Text style={s.footer}>Generated {new Date().toLocaleDateString("en-GB")} · Sportograf TL — check the event link for last-minute changes</Text>
        </View>
      </Page>
    </Document>
  );
}
