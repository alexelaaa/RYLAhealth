import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

function lockKey(weekend: string) {
  return `checkin_locked:${weekend}`;
}

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend") || "";
  if (!weekend) {
    return NextResponse.json({ locked: false });
  }

  const row = sqlite
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(lockKey(weekend)) as { value: string } | undefined;

  return NextResponse.json({ locked: row?.value === "true" });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const weekend = body.weekend || "";
  if (!weekend) {
    return NextResponse.json({ error: "Weekend is required" }, { status: 400 });
  }

  const key = lockKey(weekend);
  const now = new Date().toISOString();
  const current = sqlite
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;

  const newValue = current?.value === "true" ? "false" : "true";

  sqlite
    .prepare(
      `INSERT INTO app_settings (key, value, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_by = ?, updated_at = ?`
    )
    .run(key, newValue, session.label || session.role, now, newValue, session.label || session.role, now);

  return NextResponse.json({ locked: newValue === "true" });
}
