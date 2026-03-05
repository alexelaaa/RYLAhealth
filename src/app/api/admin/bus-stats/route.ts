import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  const rows = sqlite.prepare(`
    SELECT
      c.bus_number,
      COUNT(*) as assigned,
      SUM(CASE WHEN ci.checked_in_at IS NOT NULL THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN ci.camp_arrived_at IS NOT NULL THEN 1 ELSE 0 END) as arrived
    FROM campers c
    LEFT JOIN check_ins ci ON ci.camper_id = c.id
    WHERE c.bus_number IS NOT NULL AND c.bus_number != ''
      ${weekend ? "AND c.camp_weekend = ?" : ""}
    GROUP BY c.bus_number
    ORDER BY CAST(c.bus_number AS INTEGER), c.bus_number
  `).all(...(weekend ? [weekend] : [])) as {
    bus_number: string;
    assigned: number;
    checked_in: number;
    arrived: number;
  }[];

  return NextResponse.json(
    rows.map((r) => ({
      busNumber: r.bus_number,
      assigned: r.assigned,
      checkedIn: r.checked_in,
      arrived: r.arrived,
    }))
  );
}
