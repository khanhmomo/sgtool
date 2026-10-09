import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireUser } from "@/auth";

/** GET /api/teamleaders — any signed-in user: list active TLs for event ownership pickers */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const tls = await User.find({ role: "team_leader", active: { $ne: false } })
    .select("name acronym")
    .sort("acronym")
    .lean();
  return NextResponse.json({
    teamLeaders: tls.map((t) => ({ id: String(t._id), name: t.name, acronym: t.acronym })),
  });
}
