import type { EventDTO, FileDTO, TemplateDTO, UserDTO } from "@/types";

function j<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

const EMPTY_VENUE = {
  name: "", address: "", mapLink: "", entrance: "", parking: "",
  access: "", accreditation: "", meetingPoint: "", notes: "",
};
const EMPTY_HOTEL = {
  name: "", address: "", mapLink: "", checkIn: "", checkOut: "",
  bookingRef: "", rooms: "", roomAssign: [], breakfast: "", parking: "", notes: "",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeEvent(doc: any): EventDTO {
  const e = j(doc.toObject ? doc.toObject() : doc);
  return {
    id: String(e._id),
    ownerId: String(e.ownerId),
    ownerAcronym: e.ownerAcronym || "",
    name: e.name || "",
    type: e.type || "",
    date: e.date || "",
    endDate: e.endDate || "",
    location: e.location || "",
    country: e.country || "",
    organizer: e.organizer || "",
    website: e.website || "",
    status: e.status || "planning",
    shareSlug: e.shareSlug || null,
    venue: { ...EMPTY_VENUE, ...(e.venue || {}) },
    hotels: (
      Array.isArray(e.hotels) && e.hotels.length > 0
        ? e.hotels
        : e.hotel && typeof e.hotel === "object" && (e.hotel as { name?: string }).name
          ? [e.hotel]
          : []
    ).map((h: Record<string, unknown>) => ({ ...EMPTY_HOTEL, ...(h || {}) })),
    bestof:
      e.bestof && Array.isArray(e.bestof.images)
        ? { link: e.bestof.link || "", images: e.bestof.images }
        : null,
    transport: e.transport || [],
    schedule: e.schedule || [],
    contacts: e.contacts || [],
    photographers: e.photographers || [],
    positions: e.positions || [],
    preSpots: e.preSpots || [],
    tactic: e.tactic || [],
    hyrox: Array.isArray(e.hyrox)
      ? e.hyrox
      : e.hyrox && typeof e.hyrox === "object"
        ? [{ date: e.date || "", tactic: e.hyrox }]
        : [],
    course: e.course || null,
    documents: e.documents || [],
    checklist: e.checklist || [],
    notes: e.notes || "",
    createdAt: e.createdAt || "",
    updatedAt: e.updatedAt || "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeTemplate(doc: any): TemplateDTO {
  const t = j(doc.toObject ? doc.toObject() : doc);
  return {
    id: String(t._id),
    ownerId: String(t.ownerId),
    title: t.title || "",
    category: t.category || "other",
    tags: t.tags || [],
    body: t.body || "",
    archived: !!t.archived,
    createdAt: t.createdAt || "",
    updatedAt: t.updatedAt || "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeFile(doc: any): FileDTO {
  const f = j(doc.toObject ? doc.toObject() : doc);
  return {
    id: String(f._id),
    eventId: f.eventId ? String(f.eventId) : undefined,
    templateId: f.templateId ? String(f.templateId) : undefined,
    url: f.url,
    filename: f.filename,
    mime: f.mime || "",
    size: f.size || 0,
    category: f.category || "other",
    description: f.description || "",
    hidden: !!f.hidden,
    uploadedBy: f.uploadedBy || "",
    createdAt: f.createdAt || "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeUser(doc: any): UserDTO {
  const u = j(doc.toObject ? doc.toObject() : doc);
  return {
    id: String(u._id),
    name: u.name || "",
    acronym: u.acronym || "",
    email: u.email || "",
    image: u.image || "",
    role: u.role || "team_leader",
    mustChangePassword: !!u.mustChangePassword,
    active: u.active !== false,
    createdAt: u.createdAt || "",
  };
}
