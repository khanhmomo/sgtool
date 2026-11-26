/**
 * Live-collaboration stress test.
 *
 * 1. Seeds two test TL users + a HYROX test event with random photographers
 *    directly into Mongo (idempotent — reuses them on re-run).
 * 2. Logs both users in through the REAL auth flow (csrf → credentials).
 * 3. Simulates concurrent editors hammering PATCH /api/events/[id]:
 *      Phase A — both editors edit DIFFERENT days simultaneously (must merge clean)
 *      Phase B — rapid sequential edits alternating days (echo convergence)
 *      Phase C — conflict: both edit the SAME day at the same time (one wins, doc stays valid)
 * 4. Verifies the final DB state and reports pass/fail per phase.
 *
 * Usage: node scripts/stress-live.mjs [baseUrl]   (default http://localhost:3000)
 */
import { readFileSync } from "fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BASE = process.argv[2] || "http://localhost:3000";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);
await mongoose.connect(env.MONGODB_URI);

const UserSchema = new mongoose.Schema(
  {
    name: String,
    acronym: { type: String, unique: true, uppercase: true },
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    image: { type: String, default: "" },
    role: { type: String, default: "team_leader" },
    mustChangePassword: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Event = mongoose.models.Event || mongoose.model("Event", new mongoose.Schema({}, { strict: false, timestamps: true }), "events");

const PASSWORD = "stresstest123";
const hash = await bcrypt.hash(PASSWORD, 10);

async function upsertUser(acronym, name, email) {
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({ name, acronym, email, passwordHash: hash, role: "team_leader" });
  } else {
    u.passwordHash = hash; // keep password known across re-runs
    u.active = true;
    await u.save();
  }
  return u;
}

const userA = await upsertUser("STA", "Stress Tester A", "stress-a@test.local");
const userB = await upsertUser("STB", "Stress Tester B", "stress-b@test.local");

// ── Seed the HYROX test event ──────────────────────────────────────────────
const STATIONS = ["SkiErg", "Sled Push", "Sled Pull", "Burpees", "Rowing", "Farmers Carry", "Sandbag Lunges", "Wall Ball", "Finish", "Hero Wall", "LS Arch"];
const blankStation = (s) => ({ station: s, photographers: [], ls: [], cover: [], breaks: [], note: "" });
const blankDay = (date) => ({
  date,
  callTime: "06:00",
  published: false,
  note: "",
  tactic: { shifts: [STATIONS.map(blankStation)], switchGroups: [], switchNote: "", breaks: [{ rows: {} }], breakNote: "" },
});

const FIRST = ["An", "Minh", "Thu", "Huy", "Linh", "Khoa", "Trang", "Duc", "Mai", "Son"];
const LAST = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vo", "Dang", "Bui", "Do", "Ngo"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const photographers = Array.from({ length: 8 }, (_, i) => ({
  id: `stp${i}`,
  name: `${pick(FIRST)} ${pick(LAST)}`,
  acronym: `S${String(i + 1).padStart(2, "0")}`,
}));

const D1 = "2026-12-11";
const D2 = "2026-12-12";
let event = await Event.findOne({ name: "STRESS TEST — Hyrox Live Collab" });
if (!event) {
  event = await Event.create({
    ownerId: userA._id,
    ownerAcronym: userA.acronym,
    teamLeaders: [userB._id],
    name: "STRESS TEST — Hyrox Live Collab",
    type: "HYROX",
    date: D1,
    endDate: D2,
    location: "Test Arena",
    status: "planning",
    photographers,
    hyrox: [blankDay(D1), blankDay(D2)],
  });
} else {
  // reset to a clean baseline so re-runs are deterministic
  event.photographers = photographers;
  event.hyrox = [blankDay(D1), blankDay(D2)];
  event.markModified("hyrox");
  event.markModified("photographers");
  await event.save();
}
const eventId = String(event._id);
console.log(`✓ event ready: ${eventId}`);

// ── Real login through NextAuth credentials flow ───────────────────────────
async function login(email) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie?.() || [];
  const cookieHeader = csrfCookies.map((c) => c.split(";")[0]).join("; ");

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader },
    body: new URLSearchParams({ csrfToken, email, password: PASSWORD }),
    redirect: "manual",
  });
  const all = [...csrfCookies, ...(res.headers.getSetCookie?.() || [])];
  const session = all.map((c) => c.split(";")[0]).filter((c) => c.includes("session-token"));
  if (!session.length) throw new Error(`login failed for ${email}: no session cookie (status ${res.status})`);
  return session.join("; ");
}

const [cookieA, cookieB] = [await login("stress-a@test.local"), await login("stress-b@test.local")];
console.log("✓ both editors logged in");

// ── Editor simulation — mimics the real client's saveDays() exactly ────────
async function getEvent(cookie) {
  const res = await fetch(`${BASE}/api/events/${eventId}`, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return (await res.json()).event;
}
async function saveDays(cookie, days) {
  const server = (await getEvent(cookie)).hyrox || [];
  return fetch(`${BASE}/api/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      hyrox: days,
      hyroxChanged: days.filter((d) => !server.some((sd) => sd.date === d.date && JSON.stringify(sd) === JSON.stringify(d))).map((d) => d.date),
      hyroxBaseKeys: server.map((d) => d.date),
    }),
  });
}
/** Simulate one editor: load, mutate one station assignment on a given day, save. */
async function editOnce(cookie, date, tag, label) {
  const ev = await getEvent(cookie);
  const days = JSON.parse(JSON.stringify(ev.hyrox));
  const day = days.find((d) => d.date === date);
  if (!day) throw new Error(`${label}: day ${date} missing`);
  // assign the photographer to SkiErg — replace whatever is there (deterministic verify)
  day.tactic.shifts[0][0].photographers = [tag];
  day.note = `${label} edit`;
  const res = await saveDays(cookie, days);
  return res.ok;
}

// ── Phase A: concurrent edits on DIFFERENT days — both must survive ────────
console.log("\nPhase A — concurrent edits on different days ×10 rounds");
let aFails = 0;
for (let round = 0; round < 10; round++) {
  const [ra, rb] = await Promise.all([
    editOnce(cookieA, D1, "S01", "A"),
    editOnce(cookieB, D2, "S02", "B"),
  ]);
  if (!ra || !rb) aFails++;
}
let final = await getEvent(cookieA);
const d1 = final.hyrox.find((d) => d.date === D1);
const d2 = final.hyrox.find((d) => d.date === D2);
const aOk =
  aFails === 0 &&
  JSON.stringify(d1?.tactic?.shifts?.[0]?.[0]?.photographers) === '["S01"]' &&
  JSON.stringify(d2?.tactic?.shifts?.[0]?.[0]?.photographers) === '["S02"]';
console.log(aOk ? "✓ PASS — both editors' changes merged, nothing lost" : `✗ FAIL — d1=${JSON.stringify(d1?.tactic?.shifts?.[0]?.[0]?.photographers)} d2=${JSON.stringify(d2?.tactic?.shifts?.[0]?.[0]?.photographers)} fails=${aFails}`);

// ── Phase B: rapid alternating edits — hammering without awaiting order ────
console.log("\nPhase B — 30 rapid-fire edits, alternating editor+day, no awaiting");
const jobs = [];
for (let i = 0; i < 30; i++) {
  const cookie = i % 2 ? cookieB : cookieA;
  const date = i % 2 ? D2 : D1;
  const tag = `S0${(i % 8) + 1}`;
  jobs.push(editOnce(cookie, date, tag, "B").catch(() => false));
}
const results = await Promise.all(jobs);
final = await getEvent(cookieA);
const bValid =
  final.hyrox.length === 2 &&
  final.hyrox.every((d) => d.tactic?.shifts?.[0]?.length >= 10) &&
  results.filter(Boolean).length >= 25; // some losses expected under racing — doc must stay valid
console.log(bValid ? `✓ PASS — document valid after rapid-fire (${results.filter(Boolean).length}/30 saves ok)` : "✗ FAIL — document corrupted");

// ── Phase C: same-day conflict — exactly one winner, doc valid ─────────────
console.log("\nPhase C — both editors edit the SAME day simultaneously ×5");
let cValid = true;
for (let round = 0; round < 5; round++) {
  await Promise.all([editOnce(cookieA, D1, "S03", "CA"), editOnce(cookieB, D1, "S04", "CB")]);
  const ev = await getEvent(cookieA);
  const got = JSON.stringify(ev.hyrox.find((d) => d.date === D1)?.tactic?.shifts?.[0]?.[0]?.photographers);
  if (got !== '["S03"]' && got !== '["S04"]') cValid = false;
}
console.log(cValid ? "✓ PASS — every round converged to exactly one winner" : "✗ FAIL — conflict produced invalid state");

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\nEvent for manual testing: ${BASE}/events/${eventId}?tab=tactic`);
console.log("Logins: stress-a@test.local / stress-b@test.local — password: stresstest123");
await mongoose.disconnect();
process.exit(aOk && bValid && cValid ? 0 : 1);
