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
      SELECT dc.camper_id, dc.checked_by, dc.checked_at,
             c.first_name, c.last_name, c.bus_number, c.bus_stop,
             c.cabin_name, c.small_group, c.guardian_phone, c.cell_phone
      FROM departure_checkins dc
      INNER JOIN campers c ON dc.camper_id = c.id
      WHERE dc.camp_weekend = ?
      ORDER BY dc.checked_at DESC
    `).all(weekend);
  } else {
    rows = sqlite.prepare(`
      SELECT dc.camper_id, dc.checked_by, dc.checked_at,
             c.first_name, c.last_name, c.bus_number, c.bus_stop,
             c.cabin_name, c.small_group, c.guardian_phone, c.cell_phone
      FROM departure_checkins dc
      INNER JOIN campers c ON dc.camper_id = c.id
      ORDER BY dc.checked_at DESC
    `).all();
  }

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { camperId, campWeekend } = await request.json();
  if (!camperId) {
    return NextResponse.json({ error: "camperId is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const weekend = campWeekend || session.campWeekend || "";

  try {
    sqlite.prepare(`
      INSERT INTO departure_checkins (camper_id, checked_by, checked_at, camp_weekend)
      VALUES (?, ?, ?, ?)
    `).run(camperId, session.label || session.role, now, weekend);

    return NextResponse.json({ success: true, checkedAt: now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Already checked out" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { camperId } = await request.json();
  if (!camperId) {
    return NextResponse.json({ error: "camperId is required" }, { status: 400 });
  }

  sqlite.prepare("DELETE FROM departure_checkins WHERE camper_id = ?").run(camperId);
  return NextResponse.json({ success: true });
}
