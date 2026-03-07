import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET() {
  const row = sqlite
    .prepare("SELECT value FROM app_settings WHERE key = 'checkin_locked'")
    .get() as { value: string } | undefined;

  return NextResponse.json({ locked: row?.value === "true" });
}

export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const current = sqlite
    .prepare("SELECT value FROM app_settings WHERE key = 'checkin_locked'")
    .get() as { value: string } | undefined;

  const newValue = current?.value === "true" ? "false" : "true";

  sqlite
    .prepare(
      `INSERT INTO app_settings (key, value, updated_by, updated_at)
       VALUES ('checkin_locked', ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_by = ?, updated_at = ?`
    )
    .run(newValue, session.label || session.role, now, newValue, session.label || session.role, now);

  return NextResponse.json({ locked: newValue === "true" });
}
