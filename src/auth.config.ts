import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — providers live in auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/e/");

      if (pathname === "/") {
        return Response.redirect(new URL(isLoggedIn ? "/dashboard" : "/login", request.nextUrl));
      }
      if (isPublic) return true;
      if (!isLoggedIn) return false; // → NextAuth redirects to signIn page

      // First-login: force password change before anything else.
      // Session callback maps token.mustChangePassword onto auth.user.
      const mustChange = !!(
        auth.user as { mustChangePassword?: boolean } | undefined
      )?.mustChangePassword;
      if (mustChange && !pathname.startsWith("/change-password") && !pathname.startsWith("/api/")) {
        return Response.redirect(new URL("/change-password", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.acronym = (user as { acronym?: string }).acronym;
        token.role = (user as { role?: string }).role || "team_leader";
        token.mustChangePassword = !!(user as { mustChangePassword?: boolean }).mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid || token.sub || "");
        const u = session.user as { acronym?: string; role?: string; mustChangePassword?: boolean };
        u.acronym = String((token as { acronym?: string }).acronym || "");
        u.role = String((token as { role?: string }).role || "team_leader");
        u.mustChangePassword = !!(token as { mustChangePassword?: boolean }).mustChangePassword;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
