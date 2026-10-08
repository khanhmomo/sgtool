import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireAdmin } from "@/auth";
import { serializeUser } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    acronym: z
      .string()
      .min(2)
      .max(6)
      .regex(/^[A-Za-z0-9]+$/)
      .optional(),
    active: z.boolean().optional(),
    resetPassword: z.string().min(8).max(100).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

/** PATCH /api/accounts/[id] — admin: edit, reset password, activate/deactivate */
export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  await connectDB();
  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (String(target._id) === admin.id && parsed.data.active === false) {
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  }

  const $set: Record<string, unknown> = {};
  if (parsed.data.name) $set.name = parsed.data.name;
  if (parsed.data.acronym) $set.acronym = parsed.data.acronym.toUpperCase();
  if (parsed.data.active !== undefined) $set.active = parsed.data.active;
  if (parsed.data.resetPassword) {
    $set.passwordHash = await bcrypt.hash(parsed.data.resetPassword, 10);
    $set.mustChangePassword = true;
  }

  const doc = await User.findByIdAndUpdate(id, { $set }, { new: true });
  return NextResponse.json({ user: serializeUser(doc) });
}

/** DELETE /api/accounts/[id] — admin: permanently remove a TL account */
export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  if (id === admin.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  await connectDB();
  const res = await User.deleteOne({ _id: id });
  if (!res.deletedCount) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
