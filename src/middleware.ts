import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";

const BUS_RIDER_PATTERN = /^Bus \d+ Staff$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page, API auth routes, static files, and _next
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Bus rider restriction: only allow /bus-rider and /api/* paths
  if (BUS_RIDER_PATTERN.test(session.label || "")) {
    if (!pathname.startsWith("/bus-rider") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/bus-rider", request.url));
    }
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
