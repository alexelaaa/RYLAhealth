import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false });
  }

  return NextResponse.json({
    isLoggedIn: true,
    role: session.role,
    label: session.label,
    campWeekend: session.campWeekend || "",
  });
}
