// Shared DTO types used by server components, client components and API routes.
// These are plain JSON shapes — Mongoose documents are serialized into these.

export type EventStatus = "planning" | "ready" | "live" | "completed" | "archived";
export type Sport = "swim" | "bike" | "run" | "other";
export type DocCategory = "tactic" | "guide" | "checklist" | "note" | "other";
export type FileCategory = "map" | "briefing" | "venue" | "hotel" | "other";
export type PositionStatus = "draft" | "confirmed";

export interface VenueInfo {
  name: string;
  address: string;
  mapLink: string;
  entrance: string;
  parking: string;
  access: string;
  accreditation: string;
  meetingPoint: string;
  notes: string;
}

export interface RoomAssignment {
  id: string;
  room: string; // e.g. "101", "Room 2"
  members: string[]; // photographer acronyms
}

export interface HotelInfo {
  name: string;
  address: string;
  mapLink: string;
  checkIn: string;
  checkOut: string;
  bookingRef: string;
  rooms: string;
  roomAssign: RoomAssignment[];
  breakfast: string;
  parking: string;
  notes: string;
}

export interface Transport {
  id: string;
  kind: "airport-hotel" | "hotel-venue" | "venue-hotel" | "other";
  label: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  driver: string;
  vehicle: string;
  mapLink: string;
  notes: string;
}

export interface ScheduleItem {
  id: string;
  day: string; // e.g. "Race day" / "Oct 18"
  time: string;
  title: string;
  detail: string;
}

export interface Contact {
  id: string;
  role: string; // "Event Manager" | "Sportograf Contact" | "Emergency" | custom
  name: string;
  phone: string;
  email: string;
}

export interface Photographer {
  id: string;
  acronym: string;
  name: string;
  phone: string;
  email: string;
  role: string; // e.g. "Photographer", "Team Leader", "Drone"
  vehicle: string;
  notes: string;
}

export interface Position {
  id: string;
  photographer: string; // acronym
  sport: Sport;
  section: string; // optional sub-section e.g. "Lap 2", "Exit"
  distances: number[]; // km along course — multiple for loops
  lat: number | null;
  lng: number | null;
  mapLink: string;
  notes: string;
  status: PositionStatus;
}

export interface PreSpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  added?: boolean; // already imported into positions
}

export interface TacticRow {
  id: string;
  spot: string; // e.g. "Swim In", "Bike 1", "Finish Line"
  photographer: string; // acronym from event.photographers
  lens: string; // preferred camera lens, e.g. "70-200"
  arrival: string; // e.g. "7:00 AM"
  mapLink: string; // GPS / map location link
  note: string; // e.g. "Setup LS if available…"
  color: string; // row background color, hex e.g. "#fef3c7"
}

export interface CoursePoint {
  lat: number;
  lng: number;
  d: number; // cumulative km from leg start
}

export interface CourseLeg {
  name: string;
  sport: Sport;
  points: CoursePoint[];
  distanceKm: number;
  color?: string; // custom polyline color override
  source?: string; // e.g. "kmz" for legs imported from a KMZ file
}

export interface Course {
  legs: CourseLeg[];
  fileName: string;
  updatedAt: string;
}

export interface EventDoc {
  id: string;
  title: string;
  category: DocCategory;
  body: string; // lightweight markdown
  sourceTemplateId?: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

// ── HYROX tactic ────────────────────────────────────────────────────────────
export interface HyroxBreakRange {
  start: string; // "HH:MM"
  end: string;
}

export interface HyroxStationPlan {
  station: string; // fixed station name
  photographers: string[];
  breaks: HyroxBreakRange[]; // jumper-covered break windows
  cover: string[]; // jumper(s) covering this station
}

export interface HyroxSwitchGroup {
  id: string;
  name: string; // group label
  photographers: string[]; // ordered — 1st moves to 2nd's station, etc.
}

/** Per-shift break table: one column per break window, rows keyed by station 1-3 */
export interface HyroxBreakTable {
  times: HyroxBreakRange[]; // times[i] = time window of break column i
  rows: Record<string, string[]>; // rows[station][i] = photographer covering break i
}

/** Legacy flat break row (pre-redesign) */
export interface HyroxBreak {
  id: string;
  station: string;
  photographer: string;
  start: string; // "HH:MM"
  end: string;
}

export interface HyroxTactic {
  shifts: HyroxStationPlan[][]; // shifts[0] = shift 1 stations, [1] = shift 2
  switchGroups: HyroxSwitchGroup[];
  breaks: HyroxBreakTable[]; // breaks[shiftIdx] — stations 1-3, self-managed
}

/** One race day of a HYROX event — each day has its own tactic */
export interface HyroxDayPlan {
  date: string; // YYYY-MM-DD
  callTime: string; // "HH:MM" — crew call time for this day
  tactic: HyroxTactic;
}

export interface EventDTO {
  id: string;
  ownerId: string;
  ownerAcronym: string;
  name: string;
  type: string;
  date: string; // YYYY-MM-DD
  endDate: string;
  location: string;
  country: string;
  organizer: string;
  website: string;
  status: EventStatus;
  shareSlug: string | null;
  venue: VenueInfo;
  hotel: HotelInfo;
  transport: Transport[];
  schedule: ScheduleItem[];
  contacts: Contact[];
  photographers: Photographer[];
  positions: Position[];
  preSpots: PreSpot[];
  tactic: TacticRow[];
  hyrox: HyroxDayPlan[];
  course: Course | null;
  documents: EventDoc[];
  checklist: ChecklistGroup[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDTO {
  id: string;
  ownerId: string;
  title: string;
  category: DocCategory | "strategy";
  tags: string[];
  body: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileDTO {
  id: string;
  eventId?: string;
  templateId?: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  category: FileCategory;
  description: string;
  hidden: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  name: string;
  acronym: string;
  email: string;
  image: string;
  role: string;
}

// Result of analyzing a GPS point against the course
export interface PositionAnalysis {
  nearestKm: number; // distance along the matched leg
  nearestLeg: number; // index into course.legs
  distToCourseM: number; // meters from GPS point to nearest course point
  candidates: { legIndex: number; legName: string; sport: Sport; km: number }[];
}
