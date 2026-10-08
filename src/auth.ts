import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        await connectDB();
        const user = await User.findOne({ email });
        if (!user || user.active === false) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          image: user.image || undefined,
          acronym: user.acronym,
          role: user.role || "team_leader",
          mustChangePassword: !!user.mustChangePassword,
        };
      },
    }),
  ],
});

/** Require an authenticated user inside route handlers / server pages. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const u = session.user as { acronym?: string; role?: string; mustChangePassword?: boolean };
  return {
    id: session.user.id,
    name: session.user.name || "",
    email: session.user.email || "",
    acronym: u.acronym || "",
    role: u.role === "admin" ? "admin" : "team_leader",
    mustChangePassword: !!u.mustChangePassword,
  };
}

/** Require an admin user — returns null for TLs or anonymous callers. */
export async function requireAdmin() {
  const user = await requireUser();
  return user?.role === "admin" ? user : null;
}
