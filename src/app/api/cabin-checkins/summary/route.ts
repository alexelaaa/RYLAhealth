import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { db, sqlite } from "@/db";
import { campers } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { camperMatchesCabin, normalizeCabinPrefix } from "@/lib/cabin-utils";

interface SmallGroupRow {
  small_group: string;
  dgl_first_name: string | null;
  dgl_last_name: string | null;
  dgl_cabin: string | null;
  camp_weekend: string | null;
}

interface CheckinRow {
  camper_id: number;
  night: string;
  present: number;
}

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const weekend = request.nextUrl.searchParams.get("weekend") || session.campWeekend || "";

  // Get all DGL groups
  let dglRows: SmallGroupRow[] = [];
  try {
    dglRows = sqlite.prepare(
      `SELECT small_group, dgl_first_name, dgl_last_name, dgl_cabin, camp_weekend
       FROM small_group_info${weekend ? ` WHERE dgl_cabin IS NOT NULL AND dgl_cabin != '' AND camp_weekend = ?` : ` WHERE dgl_cabin IS NOT NULL AND dgl_cabin != ''`}`
    ).all(...(weekend ? [weekend] : [])) as SmallGroupRow[];
  } catch {
    return NextResponse.json({ cabins: [] });
  }

  // Get all campers with cabins
  const conditions = [isNotNull(campers.cabinName), sql`${campers.cabinName} != ''`];
  if (weekend) {
    conditions.push(eq(campers.campWeekend, weekend));
  }

  const allCampers = db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
      cabinName: campers.cabinName,
      noShow: campers.noShow,
    })
    .from(campers)
    .where(and(...conditions))
    .all()
    .filter((c) => !c.noShow);

  // Get all cabin checkins
  const checkinWeekendClause = weekend ? ` WHERE camp_weekend = ?` : "";
  const allCheckins = sqlite.prepare(
    `SELECT camper_id, night, present FROM cabin_checkins${checkinWeekendClause}`
  ).all(...(weekend ? [weekend] : [])) as CheckinRow[];

  const checkinMap = new Map<number, { friday: boolean; saturday: boolean }>();
  for (const ci of allCheckins) {
    if (!checkinMap.has(ci.camper_id)) {
      checkinMap.set(ci.camper_id, { friday: false, saturday: false });
    }
    const entry = checkinMap.get(ci.camper_id)!;
    if (ci.night === "friday" && ci.present === 1) entry.friday = true;
    if (ci.night === "saturday" && ci.present === 1) entry.saturday = true;
  }

  // Build summary per DGL cabin
  const cabins = dglRows.map((dgl) => {
    const dglName = dgl.dgl_first_name && dgl.dgl_last_name
      ? `${dgl.dgl_first_name} ${dgl.dgl_last_name}`
      : "Unknown";

    const cabinCampers = allCampers.filter((c) =>
      camperMatchesCabin(c.cabinName!, dgl.dgl_cabin!)
    );

    const total = cabinCampers.length;
    let fridayPresent = 0;
    let saturdayPresent = 0;

    for (const c of cabinCampers) {
      const ci = checkinMap.get(c.id);
      if (ci?.friday) fridayPresent++;
      if (ci?.saturday) saturdayPresent++;
    }

    return {
      dglName,
      dglCabin: dgl.dgl_cabin,
      smallGroup: dgl.small_group,
      totalCampers: total,
      fridayPresent,
      saturdayPresent,
      fridayComplete: total > 0 && fridayPresent === total,
      saturdayComplete: total > 0 && saturdayPresent === total,
      campers: cabinCampers.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        friday: checkinMap.get(c.id)?.friday || false,
        saturday: checkinMap.get(c.id)?.saturday || false,
      })),
    };
  }).sort((a, b) => {
    const ca = normalizeCabinPrefix(a.dglCabin || "");
    const cb = normalizeCabinPrefix(b.dglCabin || "");
    return ca.localeCompare(cb, undefined, { numeric: true });
  });

  return NextResponse.json({ cabins });
}
