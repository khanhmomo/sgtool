import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const OLD_HOST = "sgtool.vercel.app";
const NEW_ORIGIN = "https://sgtool.ktprod.com";

// Next.js 16 "proxy" (formerly middleware) — nodejs runtime, edge not supported.
// Redirects unauthenticated users to /login; public routes pass through.
// Requests to the old domain get a permanent redirect to the new domain,
// preserving path + query and flagging ?moved=1 so the app can show a notice.
export default NextAuth(authConfig).auth(function proxy(req) {
  if (req.headers.get("host") === OLD_HOST) {
    const url = new URL(req.nextUrl.pathname + req.nextUrl.search, NEW_ORIGIN);
    url.searchParams.set("moved", "1");
    return NextResponse.redirect(url, 301);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon.ico|logo.png).*)"],
};
