/**
 * Seed the admin (super) account: ankhanhct@gmail.com.
 * Usage: node scripts/seed-admin.mjs <password>
 * Reads MONGODB_URI from .env.local. Idempotent — skips if the email exists.
 */
import { readFileSync } from "fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const uri = env.MONGODB_URI;
const password = process.argv[2];
if (!uri) { console.error("MONGODB_URI missing in .env.local"); process.exit(1); }
if (!password || password.length < 8) { console.error("Usage: node scripts/seed-admin.mjs <password min 8 chars>"); process.exit(1); }

const UserSchema = new mongoose.Schema(
  {
    name: String,
    acronym: { type: String, unique: true, uppercase: true },
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    image: { type: String, default: "" },
    role: { type: String, enum: ["admin", "team_leader"], default: "team_leader" },
    mustChangePassword: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

await mongoose.connect(uri);
const email = "ankhanhct@gmail.com";
const existing = await User.findOne({ email });
if (existing) {
  let changed = false;
  if (existing.role !== "admin") {
    existing.role = "admin";
    changed = true;
  }
  if (!existing.passwordHash) {
    existing.passwordHash = await bcrypt.hash(password, 10);
    changed = true;
  }
  if (changed) {
    await existing.save();
    console.log(`Updated existing user ${email} → admin${existing.passwordHash ? " with password" : ""}.`);
  } else {
    console.log(`Admin ${email} already exists — nothing to do.`);
  }
} else {
  await User.create({
    name: "An Khanh",
    acronym: "AKT",
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
    mustChangePassword: false,
    active: true,
  });
  console.log(`Admin account created: ${email}`);
}
await mongoose.disconnect();
