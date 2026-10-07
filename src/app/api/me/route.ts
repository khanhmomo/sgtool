import { NextResponse } from "next/server";
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

  if (parsed.data.acronym) {
    const clash = await User.findOne({
      acronym: parsed.data.acronym.toUpperCase(),
      _id: { $ne: user.id },
    });
    if (clash) {
      return NextResponse.json({ error: "That acronym is already taken." }, { status: 409 });
    }
    parsed.data.acronym = parsed.data.acronym.toUpperCase();
  }

  const doc = await User.findByIdAndUpdate(user.id, { $set: parsed.data }, { new: true });
  if (!doc) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: serializeUser(doc) });
}
