import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

const schema = z.object({
  name: z.string().min(2).max(80),
  acronym: z
    .string()
    .min(2)
    .max(6)
    .regex(/^[A-Za-z0-9]+$/, "Acronym may only contain letters and numbers"),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, acronym, email, password } = parsed.data;
    await connectDB();

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { acronym: acronym.toUpperCase() }],
    });
    if (exists) {
      return NextResponse.json(
        { error: "A Team Leader with this email or acronym already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      name,
      acronym: acronym.toUpperCase(),
      email: email.toLowerCase(),
      passwordHash,
      role: "team_leader",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("register", e);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
