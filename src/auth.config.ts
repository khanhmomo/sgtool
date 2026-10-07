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
      return isLoggedIn; // unauthenticated → NextAuth redirects to signIn page
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.acronym = (user as { acronym?: string }).acronym;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid || token.sub || "");
        (session.user as { acronym?: string }).acronym = String(
          (token as { acronym?: string }).acronym || ""
        );
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
