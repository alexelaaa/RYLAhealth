import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  let rows;
  if (weekend) {
    rows = sqlite.prepare(`
      SELECT ci.id, ci.camper_id, ci.checked_in_at, ci.checked_in_by, ci.notes,
             c.first_name, c.last_name, c.camp_weekend, c.bus_number, c.cabin_number
      FROM check_ins ci
      INNER JOIN campers c ON ci.camper_id = c.id
      WHERE c.camp_weekend = ?
      ORDER BY ci.checked_in_at DESC
    `).all(weekend);
  } else {
    rows = sqlite.prepare(`
      SELECT ci.id, ci.camper_id, ci.checked_in_at, ci.checked_in_by, ci.notes,
             c.first_name, c.last_name, c.camp_weekend, c.bus_number, c.cabin_number
      FROM check_ins ci
      INNER JOIN campers c ON ci.camper_id = c.id
      ORDER BY ci.checked_in_at DESC
    `).all();
  }

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const { camperId, notes } = body;

  if (!camperId) {
    return NextResponse.json({ error: "camperId is required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    sqlite.prepare(`
      INSERT INTO check_ins (camper_id, checked_in_at, checked_in_by, notes)
      VALUES (?, ?, ?, ?)
    `).run(camperId, now, session.label || session.role, notes || null);

    return NextResponse.json({ success: true, checkedInAt: now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Camper already checked in" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
