import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface CamperRow {
  id: number;
  first_name: string;
  last_name: string;
  bus_stop: string | null;
  school: string | null;
  guardian_phone: string | null;
  cell_phone: string | null;
  role: string;
  no_show: number;
  checked_in_at: string | null;
  camp_arrived_at: string | null;
}

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");
  const detail = request.nextUrl.searchParams.get("detail");

  const rows = sqlite.prepare(`
    SELECT
      c.bus_number,
      COUNT(*) as assigned,
      SUM(CASE WHEN ci.checked_in_at IS NOT NULL THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN ci.camp_arrived_at IS NOT NULL THEN 1 ELSE 0 END) as arrived
    FROM campers c
    LEFT JOIN check_ins ci ON ci.camper_id = c.id
    WHERE c.bus_number IS NOT NULL AND c.bus_number != ''
      AND c.no_show = 0 AND c.sent_home = 0
      ${weekend ? "AND c.camp_weekend = ?" : ""}
    GROUP BY c.bus_number
    ORDER BY CAST(c.bus_number AS INTEGER), c.bus_number
  `).all(...(weekend ? [weekend] : [])) as {
    bus_number: string;
    assigned: number;
    checked_in: number;
    arrived: number;
  }[];

  const stats = rows.map((r) => ({
    busNumber: r.bus_number,
    assigned: r.assigned,
    checkedIn: r.checked_in,
    arrived: r.arrived,
  }));

  // If detail requested, also return per-bus camper lists
  if (detail === "campers") {
    const campers = sqlite.prepare(`
      SELECT c.id, c.first_name, c.last_name, c.bus_number, c.bus_stop,
             c.school, c.guardian_phone, c.cell_phone, c.role, c.no_show, c.sent_home,
             ci.checked_in_at, ci.camp_arrived_at
      FROM campers c
      LEFT JOIN check_ins ci ON ci.camper_id = c.id
      WHERE c.bus_number IS NOT NULL AND c.bus_number != ''
        AND c.no_show = 0 AND c.sent_home = 0
        ${weekend ? "AND c.camp_weekend = ?" : ""}
      ORDER BY c.last_name, c.first_name
    `).all(...(weekend ? [weekend] : [])) as (CamperRow & { bus_number: string })[];

    const campersByBus: Record<string, {
      id: number;
      firstName: string;
      lastName: string;
      busStop: string | null;
      school: string | null;
      guardianPhone: string | null;
      cellPhone: string | null;
      role: string;
      noShow: boolean;
      checkedIn: boolean;
      arrived: boolean;
    }[]> = {};

    for (const c of campers as (typeof campers[0] & { sent_home: number })[]) {
      if (!campersByBus[c.bus_number]) campersByBus[c.bus_number] = [];
      campersByBus[c.bus_number].push({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        busStop: c.bus_stop,
        school: c.school,
        guardianPhone: c.guardian_phone,
        cellPhone: c.cell_phone,
        role: c.role,
        noShow: !!c.no_show,
        checkedIn: !!c.checked_in_at,
        arrived: !!c.camp_arrived_at,
      });
    }

    return NextResponse.json({ stats, campersByBus });
  }

  return NextResponse.json(stats);
}
