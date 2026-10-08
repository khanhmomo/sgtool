import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeUser } from "@/lib/serialize";

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  acronym: z
    .string()
    .min(2)
    .max(6)
    .regex(/^[A-Za-z0-9]+$/)
    .optional(),
  image: z.string().max(500).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  await connectDB();

  const $set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined && k !== "currentPassword" && k !== "newPassword") $set[k] = v;
  }

  if (parsed.data.newPassword) {
    const doc0 = await User.findById(user.id);
    if (!doc0) return NextResponse.json({ error: "User not found" }, { status: 404 });
    // Forced first-login change already authenticated via the temp password —
    // only require the current password for voluntary changes.
    if (!doc0.mustChangePassword) {
      const ok = await bcrypt.compare(parsed.data.currentPassword || "", doc0.passwordHash);
      if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    $set.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    $set.mustChangePassword = false;
  }

  if (parsed.data.acronym) {
    const clash = await User.findOne({
      acronym: parsed.data.acronym.toUpperCase(),
      _id: { $ne: user.id },
    });
    if (clash) {
      return NextResponse.json({ error: "That acronym is already taken." }, { status: 409 });
    }
    $set.acronym = parsed.data.acronym.toUpperCase();
  }

  const doc = await User.findByIdAndUpdate(user.id, { $set }, { new: true });
  if (!doc) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: serializeUser(doc) });
}
