// Seed script — creates demo users, a realistic event, templates and files.
// Run: npx tsx scripts/seed.ts   (reads .env.local for MONGODB_URI)

import { existsSync, readFileSync } from "fs";

// Load .env.local / .env before importing anything that touches process.env
for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_0-9]+)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set — copy .env.example to .env.local first.");
  process.exit(1);
}

// ── Demo GPX: a bike loop (ridden twice) + a run leg near Century Park, Shanghai
function circleLoop(centerLat: number, centerLng: number, radiusKm: number, laps: number) {
  const pts: { lat: number; lng: number }[] = [];
  const n = 40;
  for (let lap = 0; lap < laps; lap++) {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({
        lat: centerLat + (radiusKm / 111.32) * Math.sin(a),
        lng: centerLng + (radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180))) * Math.cos(a),
      });
    }
  }
  return pts;
}

function linePts(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  n: number,
  wiggle = 0.0008
) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({
      lat: from.lat + (to.lat - from.lat) * t + Math.sin(t * Math.PI * 6) * wiggle,
      lng: from.lng + (to.lng - from.lng) * t + Math.sin(t * Math.PI * 4) * wiggle * 1.3,
    });
  }
  return pts;
}

function trkXml(name: string, pts: { lat: number; lng: number }[]): string {
  const segs = pts
    .map((p) => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"></trkpt>`)
    .join("\n      ");
  return `  <trk><name>${name}</name>\n    <trkseg>\n      ${segs}\n    </trkseg>\n  </trk>`;
}

const bikePts = circleLoop(31.222, 121.545, 1.45, 2); // ~2 laps ≈ 18.2 km loop
const runPts = linePts({ lat: 31.2304, lng: 121.4737 }, { lat: 31.2415, lng: 121.4825 }, 60);

const GPX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SportografTL-seed" xmlns="http://www.topografix.com/GPX/1/1">
${trkXml("Bike", bikePts)}
${trkXml("Run", runPts)}
</gpx>`;

// ── Minimal valid single-page PDF ──────────────────────────────────────────
function makePdf(lines: string[]): Buffer {
  const content = [
    "BT /F1 20 Tf 56 770 Td (" + escapePdf(lines[0] || "") + ") Tj ET",
    ...lines.slice(1).map((l, i) => `BT /F1 11 Tf 56 ${740 - i * 18} Td (${escapePdf(l)}) Tj ET`),
  ].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function escapePdf(s: string): string {
  return s.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "");
}

async function main() {
  const { connectDB } = await import("../src/lib/db");
  const { User, Event, Template, FileDoc } = await import("../src/lib/models");
  const { parseGpx } = await import("../src/lib/gpx");
  const { analyzePosition } = await import("../src/lib/geo");
  const { storeFile } = await import("../src/lib/storage");
  const bcrypt = (await import("bcryptjs")).default;

  await connectDB();
  console.log("Connected to MongoDB");

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const [akt] = await Promise.all([
    User.findOneAndUpdate(
      { email: "akt@sportograf.com" },
      { name: "Mo Tran", acronym: "AKT", email: "akt@sportograf.com", passwordHash, role: "team_leader" },
      { upsert: true, new: true }
    ),
    User.findOneAndUpdate(
      { email: "gip@sportograf.com" },
      { name: "Giang Pham", acronym: "GIP", email: "gip@sportograf.com", passwordHash, role: "team_leader" },
      { upsert: true, new: true }
    ),
  ]);
  console.log("Users: AKT / GIP (password: demo1234)");

  // ── Templates (Bookshelf) ──────────────────────────────────────────────
  const tplData = [
    {
      title: "IRONMAN Bike Position Guide",
      category: "guide",
      tags: ["ironman", "bike"],
      body: `# IRONMAN Bike Position Guide

## Choosing positions
- **Corners after fast sections** — riders brake, faces visible
- **Top of climbs** — slower speeds, more frames per rider
- **Feed stations** — riders reach for bottles, watch for debris

## Framing
- Shoot *against* the sun in the morning for rim light
- Keep sponsor banners in background when possible

## Loop courses
- One physical spot = multiple race distances — note **all** laps`,
    },
    {
      title: "Standard Event Tactic",
      category: "tactic",
      tags: ["tactic", "default"],
      body: `# Standard Race Tactic

## Pre-race
- Team briefing **60 min before start** at meeting point
- Confirm all positions are pinned in this tool
- Check weather + wind direction for lens choice

## Coverage rules
- Every position manned until last athlete passes
- TL rotates **photographers between laps** on loop courses
- Keep WhatsApp location sharing ON all day

## After last athlete
- Move to finish area for podium/celebration shots
- Memory cards backed up before leaving venue`,
    },
    {
      title: "Event Preparation Checklist",
      category: "checklist",
      tags: ["checklist"],
      body: `Confirm venue and meeting point
Confirm hotel and transfers
Confirm accreditation pickup
Download course map
Upload GPX course file
Assign photographers to positions
Generate and send position list
Send photographer event link
Confirm equipment (bodies, lenses, batteries, cards)
Confirm emergency contacts`,
    },
    {
      title: "Night Race Checklist",
      category: "checklist",
      tags: ["checklist", "night"],
      body: `High-ISO bodies charged
Fast lenses (f/2.8 or faster) packed
Flash/strobe triggers tested
Headlamps for moving between positions
High-vis vests for all photographers`,
    },
  ];
  for (const t of tplData) {
    await Template.findOneAndUpdate(
      { ownerId: akt._id, title: t.title },
      { ...t, ownerId: akt._id },
      { upsert: true }
    );
  }
  console.log(`Templates: ${tplData.length}`);

  // ── Course ─────────────────────────────────────────────────────────────
  const course = parseGpx(GPX_XML, "Shanghai_70.3_course.gpx");
  console.log(
    `Course parsed: ${course.legs.map((l) => `${l.name} ${l.distanceKm.toFixed(1)}km`).join(", ")}`
  );

  // ── Positions derived from course points via the same analysis the UI uses ──
  const bikeLeg = course.legs[0];
  const runLeg = course.legs[1];
  const round1 = (n: number) => Math.round(n * 10) / 10;

  function posAt(legIdx: number, frac: number, photographer: string, sport: string, notes: string, seq: number) {
    const pts = course.legs[legIdx].points;
    const target = frac * (pts[pts.length - 1].d || 0);
    const p = pts.reduce((best, pt) => (Math.abs(pt.d - target) < Math.abs(best.d - target) ? pt : best));
    const an = analyzePosition(course.legs, p.lat, p.lng, 20);
    const distances = an?.candidates.length
      ? an.candidates.map((c) => round1(c.km)).sort((a, b) => a - b)
      : [round1(target)];
    return {
      id: `${photographer}_${String(seq).padStart(2, "0")}`,
      photographer,
      sport,
      section: "",
      distances,
      lat: p.lat,
      lng: p.lng,
      mapLink: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
      notes,
      status: "confirmed",
    };
  }

  const positions = [
    posAt(0, 0.03, "AKT", "bike", "Corner after bridge — shoot panning into the park", 1),
    posAt(0, 0.4, "GIP", "bike", "Feed station exit — riders reaching for bottles", 1),
    posAt(0, 0.75, "MAT", "bike", "North curve, skyline backdrop", 1),
    posAt(1, 0.35, "JOE", "run", "Riverside straight — morning backlight", 1),
    posAt(1, 0.9, "JOE", "run", "Finish chute approach", 2),
  ];
  void bikeLeg;
  void runLeg;

  // ── Event ──────────────────────────────────────────────────────────────
  const shareSlug = "sh4ng2026";
  const eventData = {
    ownerId: akt._id,
    ownerAcronym: "AKT",
    name: "IRONMAN 70.3 Shanghai 2026",
    type: "IRONMAN 70.3",
    date: "2026-10-18",
    endDate: "2026-10-18",
    location: "Shanghai",
    country: "China",
    organizer: "IRONMAN Asia",
    website: "https://www.ironman.com",
    status: "ready",
    shareSlug,
    venue: {
      name: "Century Park Start/Finish",
      address: "1001 Jinxiu Rd, Pudong, Shanghai",
      mapLink: "https://www.google.com/maps/search/?api=1&query=31.2193,121.5520",
      entrance: "Gate 7 — staff & media entrance",
      parking: "Media parking at Gate 7 lot, pass required",
      access: "Show accreditation QR + photo ID at media gate",
      accreditation: "Pick up Fri 14:00–18:00 at race office, Gate 5",
      meetingPoint: "Media tent behind finish arch, 05:30 race day",
      notes: "No vehicle access inside the park after 06:00.",
    },
    hotel: {
      name: "Novotel Shanghai Atlantis",
      address: "728 Pudong Ave, Shanghai",
      mapLink: "https://www.google.com/maps/search/?api=1&query=31.2405,121.5072",
      checkIn: "Oct 17, from 14:00",
      checkOut: "Oct 19, 11:00",
      bookingRef: "SPT-88231",
      rooms: "AKT/GIP — 1204 · MAT/JOE — 1206",
      breakfast: "05:00–10:00 early race-day breakfast, lobby level",
      parking: "Underground garage, validated",
      notes: "Late checkout arranged for race day gear storage.",
    },
    transport: [
      {
        id: "t1",
        kind: "airport-hotel",
        label: "Arrival transfer",
        date: "2026-10-17",
        time: "15:30",
        pickup: "PVG Terminal 2 arrivals",
        destination: "Novotel Shanghai Atlantis",
        driver: "Mr. Li +86 138 xxxx",
        vehicle: "Van — plate 沪B-8842",
        mapLink: "",
        notes: "Look for SPORTOGRAF sign.",
      },
      {
        id: "t2",
        kind: "hotel-venue",
        label: "Race day shuttle",
        date: "2026-10-18",
        time: "05:00",
        pickup: "Hotel lobby",
        destination: "Century Park Gate 7",
        driver: "",
        vehicle: "Media shuttle",
        mapLink: "",
        notes: "Do NOT miss — last shuttle.",
      },
    ],
    schedule: [
      { id: "s1", day: "Oct 17 — Setup", time: "14:00", title: "Accreditation pickup", detail: "Race office, Gate 5" },
      { id: "s2", day: "Oct 17 — Setup", time: "17:00", title: "Course recce", detail: "Drive the bike loop together" },
      { id: "s3", day: "Oct 18 — Race day", time: "05:00", title: "Shuttle departs hotel", detail: "Lobby, do not be late" },
      { id: "s4", day: "Oct 18 — Race day", time: "05:30", title: "Team briefing", detail: "Media tent behind finish arch" },
      { id: "s5", day: "Oct 18 — Race day", time: "06:30", title: "Swim start", detail: "Coverage: drone + lakeside" },
      { id: "s6", day: "Oct 18 — Race day", time: "08:00", title: "Bike course live", detail: "All bike positions manned" },
      { id: "s7", day: "Oct 18 — Race day", time: "11:30", title: "Run coverage", detail: "Riverside + finish chute" },
      { id: "s8", day: "Oct 18 — Race day", time: "15:30", title: "Card backup & debrief", detail: "Media tent" },
    ],
    contacts: [
      { id: "c1", role: "Event Manager", name: "Sarah Chen", phone: "+86 138 1234 5678", email: "s.chen@ironman.cn" },
      { id: "c2", role: "Sportograf Ops", name: "HQ Support", phone: "+49 211 555 1234", email: "ops@sportograf.com" },
      { id: "c3", role: "Emergency", name: "Race Medical", phone: "+86 120", email: "" },
    ],
    photographers: [
      { id: "p1", acronym: "AKT", name: "Mo Tran", phone: "+84 901 111 111", email: "akt@sportograf.com", role: "Team Leader", vehicle: "Van", notes: "" },
      { id: "p2", acronym: "GIP", name: "Giang Pham", phone: "+84 902 222 222", email: "gip@sportograf.com", role: "Photographer", vehicle: "Motorbike", notes: "" },
      { id: "p3", acronym: "MAT", name: "Mateo Alvarez", phone: "+52 55 3333", email: "mat@sportograf.com", role: "Photographer", vehicle: "", notes: "" },
      { id: "p4", acronym: "JOE", name: "Joe Baker", phone: "+44 7700 900123", email: "joe@sportograf.com", role: "Photographer", vehicle: "Bike", notes: "" },
    ],
    positions,
    course,
    documents: [
      {
        id: "d1",
        title: "Race Day Tactic — Shanghai 70.3",
        category: "tactic",
        body: `# Race Day Tactic — Shanghai 70.3

## Coverage plan
- **AKT_01** covers lap 1 + lap 2 at the same spot (loop!) — riders pass twice
- **GIP_01** feed station exit — every rider passes here each lap
- **MAT_01** north curve — skyline backdrop, priority for hero shots
- **JOE_01/02** run course riverside + finish chute

## Communication
- Send your Google Maps pin to TL when you reach your position
- Update this tool if you move — positions must stay accurate
- Channel: WhatsApp group "SHA-70.3-2026"`,
        updatedAt: new Date().toISOString(),
      },
      {
        id: "d2",
        title: "Equipment Notes",
        category: "note",
        body: `## Gear
- 2× bodies per photographer, 24-70 + 70-200
- Polarizers for riverside glare
- **MAT**: bring 400mm for the north curve compression shots

## Cards
- Shoot RAW+JPG, dual-slot backup ON
- Card dump at 12:00 midday break`,
        updatedAt: new Date().toISOString(),
      },
    ],
    checklist: [
      {
        id: "cl1",
        title: "PRE-EVENT",
        items: [
          { id: "i1", text: "Confirm venue and meeting point", done: true },
          { id: "i2", text: "Confirm hotel and transfers", done: true },
          { id: "i3", text: "Upload GPX course file", done: true },
          { id: "i4", text: "Assign photographers to positions", done: true },
          { id: "i5", text: "Send event link to team", done: false },
          { id: "i6", text: "Confirm accreditation pickup", done: false },
        ],
      },
    ],
    notes:
      "⚠ Race day is expected **hot and humid** — brief photographers on hydration and sun protection.\n\nMedia Wi-Fi is usually unreliable — download offline maps.",
  };

  const event = await Event.findOneAndUpdate({ shareSlug }, eventData, {
    upsert: true,
    new: true,
  });
  console.log(`Event: ${event.name} — share link /e/${shareSlug}`);

  // ── Files: GPX + generated PDF briefing ────────────────────────────────
  await FileDoc.deleteMany({ eventId: event._id });
  try {
    const gpxFile = new File([GPX_XML], "Shanghai_70.3_course.gpx", {
      type: "application/gpx+xml",
    });
    const storedGpx = await storeFile(gpxFile);
    await FileDoc.create({
      eventId: event._id,
      ownerId: akt._id,
      url: storedGpx.url,
      filename: "Shanghai_70.3_course.gpx",
      mime: "application/gpx+xml",
      size: storedGpx.size,
      category: "map",
      description: "Official course file (bike loop + run)",
      uploadedBy: "AKT",
    });

    const pdfBuf = makePdf([
      "IRONMAN 70.3 Shanghai 2026 — Race Briefing",
      "",
      "Media meeting point: behind finish arch, 05:30",
      "Media gate: Century Park Gate 7 (accreditation + photo ID)",
      "Bike course: 2 laps, park loop — positions are valid for BOTH laps",
      "Run course: riverside out-and-back",
      "",
      "Emergency contact: Race Medical +86 120",
      "Team Leader on site: AKT (Mo Tran)",
    ]);
    const pdfFile = new File([new Uint8Array(pdfBuf)], "Race_Briefing.pdf", { type: "application/pdf" });
    const storedPdf = await storeFile(pdfFile);
    await FileDoc.create({
      eventId: event._id,
      ownerId: akt._id,
      url: storedPdf.url,
      filename: "Race_Briefing.pdf",
      mime: "application/pdf",
      size: storedPdf.size,
      category: "briefing",
      description: "Race day briefing document",
      uploadedBy: "AKT",
    });
    console.log("Files: GPX + Race_Briefing.pdf uploaded");
  } catch (e) {
    console.warn("File seeding skipped:", e);
  }

  console.log("\nDone. Login: akt@sportograf.com / demo1234");
  console.log(`Photographer link: /e/${shareSlug}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
