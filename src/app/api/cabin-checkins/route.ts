import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { db, sqlite } from "@/db";
import { campers } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { camperMatchesCabin } from "@/lib/cabin-utils";

interface CheckinRow {
  camper_id: number;
  night: string;
  present: number;
}

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // DGLs use their session cabin; admins can pass a cabin query param
  let dglCabin: string | null = null;
  let campWeekend: string | null = null;

  if (session.role === "dgl") {
    dglCabin = session.dglCabin || null;
    campWeekend = session.campWeekend || null;
    if (!dglCabin) {
      return NextResponse.json({ error: "No cabin assigned" }, { status: 400 });
    }
  } else if (session.role === "admin") {
    dglCabin = request.nextUrl.searchParams.get("cabin");
    campWeekend = request.nextUrl.searchParams.get("weekend") || session.campWeekend || null;
    if (!dglCabin) {
      return NextResponse.json({ error: "cabin param required" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get campers with cabin assignments
  const conditions = [isNotNull(campers.cabinName), sql`${campers.cabinName} != ''`];
  if (campWeekend) {
    conditions.push(eq(campers.campWeekend, campWeekend));
  }

  const allCampers = db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
      cabinName: campers.cabinName,
      smallGroup: campers.smallGroup,
      noShow: campers.noShow,
      sentHome: campers.sentHome,
    })
    .from(campers)
    .where(and(...conditions))
    .all();

  // Filter to matching cabin
  const cabinCampers = allCampers
    .filter((c) => camperMatchesCabin(c.cabinName!, dglCabin!))
    .filter((c) => !c.noShow && !c.sentHome)
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  // Get existing check-ins for these campers
  const camperIds = cabinCampers.map((c) => c.id);
  let checkins: CheckinRow[] = [];
  if (camperIds.length > 0) {
    const placeholders = camperIds.map(() => "?").join(",");
    const weekendClause = campWeekend ? ` AND camp_weekend = ?` : "";
    checkins = sqlite.prepare(
      `SELECT camper_id, night, present FROM cabin_checkins
       WHERE camper_id IN (${placeholders})${weekendClause}`
    ).all(...camperIds, ...(campWeekend ? [campWeekend] : [])) as CheckinRow[];
  }

  // Build checkin map: camper_id -> { arrival: bool, friday: bool, saturday: bool }
  const checkinMap = new Map<number, { arrival: boolean; friday: boolean; saturday: boolean }>();
  for (const ci of checkins) {
    if (!checkinMap.has(ci.camper_id)) {
      checkinMap.set(ci.camper_id, { arrival: false, friday: false, saturday: false });
    }
    const entry = checkinMap.get(ci.camper_id)!;
    if (ci.night === "arrival") entry.arrival = ci.present === 1;
    if (ci.night === "friday") entry.friday = ci.present === 1;
    if (ci.night === "saturday") entry.saturday = ci.present === 1;
  }

  const result = cabinCampers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    cabinName: c.cabinName,
    arrival: checkinMap.get(c.id)?.arrival || false,
    friday: checkinMap.get(c.id)?.friday || false,
    saturday: checkinMap.get(c.id)?.saturday || false,
  }));

  return NextResponse.json({ campers: result, cabin: dglCabin, campWeekend });
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || (session.role !== "dgl" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { camperId, night, present, campWeekend: reqWeekend } = await request.json();

  if (!camperId || !night || !["arrival", "friday", "saturday"].includes(night)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const campWeekend = session.role === "dgl"
    ? (session.campWeekend || "")
    : (reqWeekend || session.campWeekend || "");

  if (!campWeekend) {
    return NextResponse.json({ error: "No camp weekend" }, { status: 400 });
  }

  // For DGLs, verify camper belongs to their cabin
  if (session.role === "dgl" && session.dglCabin) {
    const camper = db.select({ cabinName: campers.cabinName })
      .from(campers)
      .where(eq(campers.id, camperId))
      .get();

    if (!camper?.cabinName || !camperMatchesCabin(camper.cabinName, session.dglCabin)) {
      return NextResponse.json({ error: "Camper not in your cabin" }, { status: 403 });
    }
  }

  const checkedBy = session.label;
  const now = new Date().toISOString();

  // Upsert: INSERT OR REPLACE using the unique index
  sqlite.prepare(`
    INSERT INTO cabin_checkins (camper_id, night, present, checked_by, camp_weekend, checked_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(camper_id, night, camp_weekend)
    DO UPDATE SET present = excluded.present, checked_by = excluded.checked_by, checked_at = excluded.checked_at
  `).run(camperId, night, present ? 1 : 0, checkedBy, campWeekend, now);

  return NextResponse.json({ success: true });
}
