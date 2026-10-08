import mongoose, { Schema } from "mongoose";

// ── User (Team Leader) ─────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    acronym: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    image: { type: String, default: "" },
    role: { type: String, enum: ["admin", "team_leader"], default: "team_leader" },
    mustChangePassword: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Event ──────────────────────────────────────────────────────────────────
// Embedded sub-content is stored as Mixed objects (ids generated client-side)
// so PATCH routes can replace whole arrays without _id bookkeeping.
const EventSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerAcronym: { type: String, default: "" },
    name: { type: String, required: true },
    type: { type: String, default: "Triathlon" },
    date: { type: String, default: "" }, // YYYY-MM-DD
    endDate: { type: String, default: "" },
    location: { type: String, default: "" },
    country: { type: String, default: "" },
    organizer: { type: String, default: "" },
    website: { type: String, default: "" },
    status: {
      type: String,
      enum: ["planning", "ready", "live", "completed", "archived"],
      default: "planning",
      index: true,
    },
    shareSlug: { type: String, unique: true, sparse: true },
    venue: { type: Schema.Types.Mixed, default: {} },
    hotel: { type: Schema.Types.Mixed, default: {} },
    transport: { type: [Schema.Types.Mixed], default: [] },
    schedule: { type: [Schema.Types.Mixed], default: [] },
    contacts: { type: [Schema.Types.Mixed], default: [] },
    photographers: { type: [Schema.Types.Mixed], default: [] },
    positions: { type: [Schema.Types.Mixed], default: [] },
    preSpots: { type: [Schema.Types.Mixed], default: [] },
    tactic: { type: [Schema.Types.Mixed], default: [] },
    hyrox: { type: Schema.Types.Mixed, default: null },
    course: { type: Schema.Types.Mixed, default: null },
    documents: { type: [Schema.Types.Mixed], default: [] },
    checklist: { type: [Schema.Types.Mixed], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

EventSchema.index({ name: "text", location: "text", type: "text", ownerAcronym: "text" });
EventSchema.index({ date: -1 });

// ── Bookshelf Template ─────────────────────────────────────────────────────
const TemplateSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["tactic", "guide", "checklist", "note", "strategy", "other"],
      default: "other",
      index: true,
    },
    tags: { type: [String], default: [] },
    body: { type: String, default: "" },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
TemplateSchema.index({ title: "text", body: "text", tags: "text" });

// ── File metadata (binary lives in Vercel Blob / local uploads) ────────────
const FileSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "Template", index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mime: { type: String, default: "" },
    size: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ["map", "briefing", "venue", "hotel", "other"],
      default: "other",
    },
    description: { type: String, default: "" },
    hidden: { type: Boolean, default: false },
    uploadedBy: { type: String, default: "" },
  },
  { timestamps: true }
);
FileSchema.index({ filename: "text", description: "text" });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
export const Template = mongoose.models.Template || mongoose.model("Template", TemplateSchema);
export const FileDoc = mongoose.models.FileDoc || mongoose.model("FileDoc", FileSchema);
