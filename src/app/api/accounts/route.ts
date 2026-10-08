import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireAdmin } from "@/auth";
import { serializeUser } from "@/lib/serialize";
import { sendWelcomeEmail } from "@/lib/mail";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  acronym: z
    .string()
    .min(2)
    .max(6)
    .regex(/^[A-Za-z0-9]+$/, "Acronym may only contain letters and numbers"),
  email: z.string().email(),
});

// Random 8-char temp password — unambiguous chars only (no 0/O, 1/l/I)
const TEMP_CHARS = "abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function genTempPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => TEMP_CHARS[b % TEMP_CHARS.length]).join("");
}

/** GET /api/accounts — admin: list all TL accounts */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await connectDB();
  const users = await User.find().sort({ createdAt: -1 });
  return NextResponse.json({ users: users.map(serializeUser) });
}

/** POST /api/accounts — admin: create a TL account (forces first-login password change) */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { name, acronym, email } = parsed.data;
  const tempPassword = genTempPassword();
  await connectDB();

  const exists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { acronym: acronym.toUpperCase() }],
  });
  if (exists) {
    return NextResponse.json(
      { error: "A user with this email or acronym already exists." },
      { status: 409 }
    );
  }

  const doc = await User.create({
    name,
    acronym: acronym.toUpperCase(),
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(tempPassword, 10),
    role: "team_leader",
    mustChangePassword: true,
    active: true,
  });

  // Welcome email is best-effort — account creation succeeds either way
  let emailSent = true;
  let emailError = "";
  try {
    const base =
      process.env.AUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "sgtool.vercel.app"}`;
    await sendWelcomeEmail({
      name,
      acronym: acronym.toUpperCase(),
      email: email.toLowerCase(),
      tempPassword,
      loginUrl: `${base}/login`,
    });
  } catch (e) {
    emailSent = false;
    emailError = e instanceof Error ? e.message : "Failed to send email";
    console.error("welcome email", e);
  }

  // tempPassword returned so the admin can copy it if the email fails
  return NextResponse.json(
    { user: serializeUser(doc), tempPassword, emailSent, emailError },
    { status: 201 }
  );
}
