import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 "proxy" (formerly middleware) — nodejs runtime, edge not supported.
// Redirects unauthenticated users to /login; public routes pass through.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon.ico|logo.png).*)"],
};
