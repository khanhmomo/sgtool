import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireUser } from "@/auth";
import { serializeUser } from "@/lib/serialize";
import { storeFile } from "@/lib/storage";

/** POST /api/me/avatar — multipart image upload, sets the caller's profile avatar */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Avatar must be an image file" }, { status: 400 });
  }

  let stored;
  try {
    stored = await storeFile(file);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 }
    );
  }

  await connectDB();
  const doc = await User.findByIdAndUpdate(user.id, { $set: { image: stored.url } }, { new: true });
  if (!doc) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: serializeUser(doc) });
}
