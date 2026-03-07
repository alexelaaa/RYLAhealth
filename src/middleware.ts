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
    pathname === "/tv" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/push/vapid-key") ||
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

  // Bussing role restriction: only bus-tracker, bus-rider, and API routes
  if (session.role === "bussing") {
    if (
      !pathname.startsWith("/bus-tracker") &&
      !pathname.startsWith("/bus-rider") &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/bus-tracker", request.url));
    }
  }

  // DGL role restriction: cabin-checkin, schedule, map, and API routes
  if (session.role === "dgl") {
    const dglAllowed =
      pathname.startsWith("/cabin-checkin") ||
      pathname.startsWith("/schedule") ||
      pathname.startsWith("/map") ||
      pathname.startsWith("/api/");
    if (!dglAllowed) {
      return NextResponse.redirect(new URL("/cabin-checkin", request.url));
    }
  }

  // Alumni role restriction: schedule, map, groups, and API routes
  if (session.role === "alumni") {
    const alumniAllowed =
      pathname.startsWith("/schedule") ||
      pathname.startsWith("/map") ||
      pathname.startsWith("/groups") ||
      pathname.startsWith("/api/");
    if (!alumniAllowed) {
      return NextResponse.redirect(new URL("/schedule", request.url));
    }
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
};
