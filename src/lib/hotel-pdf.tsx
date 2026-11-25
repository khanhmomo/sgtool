import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { EventDTO, HotelInfo } from "@/types";

const C = {
  ink: "#0f172a",
  sub: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  head: "#1e293b",
  blue: "#2563eb",
  blueSoft: "#eff6ff",
};

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 9, fontFamily: "Helvetica", color: C.ink, backgroundColor: "#ffffff" },
  hero: { backgroundColor: C.head, padding: "22 30 16 30", borderBottomWidth: 4, borderBottomColor: C.blue },
  heroKicker: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blue, letterSpacing: 2.4, textTransform: "uppercase" },
  heroTitle: { fontSize: 19, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 5 },
  heroMeta: { fontSize: 8.5, color: "#cbd5e1", marginTop: 5 },
  body: { padding: "16 30 24 30" },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 7, marginBottom: 14, padding: "10 12 12 12" },
  hotelTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.ink },
  sub: { fontSize: 8.5, color: C.sub, marginTop: 3 },
  checkCard: { flexDirection: "row", marginTop: 8, borderWidth: 1, borderColor: C.line, borderRadius: 5 },
  checkHalf: { flex: 1, backgroundColor: C.blueSoft, padding: "7 10 8 10" },
  checkLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blue, textTransform: "uppercase", letterSpacing: 1.2 },
  checkValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 2.5 },
  checkArrow: { justifyContent: "center", paddingHorizontal: 8, backgroundColor: "#ffffff" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  detail: { width: "50%", paddingRight: 12, paddingVertical: 3 },
  detailLabel: { fontSize: 6.8, fontFamily: "Helvetica-Bold", color: C.sub, textTransform: "uppercase", letterSpacing: 1 },
  detailValue: { fontSize: 9, marginTop: 1.5 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 5, marginTop: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.line },
  thRow: { flexDirection: "row", backgroundColor: C.head, borderTopLeftRadius: 4, borderTopRightRadius: 4, paddingVertical: 5, minHeight: 18, alignItems: "center" },
  thTxt: { color: "#e2e8f0", fontSize: 6.8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", paddingHorizontal: 7 },
  td: { paddingVertical: 5, paddingHorizontal: 7 },
  tdTxt: { fontSize: 8.5 },
  roomName: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  dim: { color: C.sub, fontSize: 8 },
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.sub, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 10, marginBottom: 2 },
  note: { fontSize: 8.5, color: C.sub, marginTop: 6 },
  footer: { marginTop: 10, paddingTop: 6, borderTopWidth: 0.6, borderTopColor: C.line, fontSize: 6.5, color: C.faint },
});

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

const fmtD = (d: string) => {
  if (!d) return "";
  const dt = new Date(`${d.slice(0, 10)}T12:00:00`);
  return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

function Detail({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  if (!value || !value.trim()) return null;
  return (
    <View style={[s.detail, wide ? { width: "100%" } : {}]}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{plain(value)}</Text>
    </View>
  );
}

export function HotelPdf({ event }: { event: EventDTO }) {
  const start = event.date?.slice(0, 10) || "";
  const end = (event.endDate || "").slice(0, 10);
  const when = [fmtD(start), end && end !== start ? fmtD(end) : ""].filter(Boolean).join(" – ");
  const tl = [event.ownerAcronym, ...(event.teamLeaderInfos || []).map((t) => t.acronym)].filter(Boolean).join(" · ");
  const nameOf = (acr: string) => (event.photographers || []).find((p) => p.acronym === acr.trim())?.name || "";
  const personLabel = (acr: string) => {
    const n = nameOf(acr);
    return n ? `${acr} — ${n}` : acr;
  };

  const hotels = event.hotels || [];

  return (
    <Document title={`${event.name} — Hotel info`} author="Sportograf TL">
      <Page size="A4" style={s.page}>
        <View style={s.hero}>
          <Text style={s.heroKicker}>Sportograf · Event briefing</Text>
          <Text style={s.heroTitle}>{event.name} — Hotel info</Text>
          <Text style={s.heroMeta}>{[when, event.location, event.country, tl && `TL: ${tl}`].filter(Boolean).join("   ·   ")}</Text>
        </View>

        <View style={s.body}>
          {hotels.map((h: HotelInfo, i) => {
            const rooms = h.roomAssign || [];
            const allAcronyms = new Set((event.photographers || []).map((p) => p.acronym));
            const orphanMembers = new Set(
              rooms.flatMap((r) => r.members).filter((m) => !allAcronyms.has(m))
            );
            return (
              <View key={i} wrap={false} style={s.card}>
                <Text style={s.hotelTitle}>{h.name || `Hotel ${i + 1}`}</Text>
                {h.address ? (
                  <Text style={s.sub}>
                    {h.mapLink ? <Link src={h.mapLink} style={{ color: C.sub, textDecoration: "none" }}>{plain(h.address)}</Link> : plain(h.address)}
                  </Text>
                ) : null}

                {(h.checkIn || h.checkOut) ? (
                  <View style={s.checkCard}>
                    <View style={[s.checkHalf, { borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderRightWidth: 0.6, borderRightColor: C.line }]}>
                      <Text style={s.checkLabel}>Check-in</Text>
                      <Text style={s.checkValue}>{plain(h.checkIn)}</Text>
                    </View>
                    <View style={s.checkArrow}>
                      <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: C.blue }}>→</Text>
                    </View>
                    <View style={[s.checkHalf, { borderTopRightRadius: 4, borderBottomRightRadius: 4 }]}>
                      <Text style={s.checkLabel}>Check-out</Text>
                      <Text style={s.checkValue}>{plain(h.checkOut)}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={s.detailGrid}>
                  <Detail label="Booking ref" value={h.bookingRef} />
                  <Detail label="Rooms" value={h.rooms} />
                  <Detail label="Breakfast" value={h.breakfast} />
                  <Detail label="Parking" value={h.parking} />
                </View>

                {rooms.length > 0 && (
                  <>
                    <Text style={s.sectionLabel}>Room assignments</Text>
                    <View style={s.table}>
                      <View style={s.thRow}>
                        <View style={{ width: "30%" }}><Text style={s.thTxt}>Room</Text></View>
                        <View style={{ width: "70%" }}><Text style={s.thTxt}>Members</Text></View>
                      </View>
                      {rooms.map((r, ri) => (
                        <View key={r.id || ri} wrap={false} style={[s.tr, ri === rooms.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                          <View style={[s.td, { width: "30%" }]}>
                            <Text style={s.roomName}>{r.room || `Room ${ri + 1}`}</Text>
                          </View>
                          <View style={[s.td, { width: "70%" }]}>
                            <Text style={s.tdTxt}>{(r.members || []).map(personLabel).join("\n")}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {orphanMembers.size > 0 && (
                  <Text style={s.note}>Not on team list: {[...orphanMembers].join(", ")}</Text>
                )}

                {h.notes?.trim() ? <Text style={s.note}>{plain(h.notes)}</Text> : null}
              </View>
            );
          })}

          {hotels.length === 0 && <Text style={s.sub}>No hotel info yet.</Text>}

          <Text style={s.footer}>Generated {new Date().toLocaleDateString("en-GB")} · Sportograf TL — check the event link for last-minute changes</Text>
        </View>
      </Page>
    </Document>
  );
}
