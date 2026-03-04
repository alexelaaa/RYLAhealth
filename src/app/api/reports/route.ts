import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

interface CountRow {
  name: string;
  total: number;
  male: number;
  female: number;
}

function groupCounts(column: string, weekend?: string | null): CountRow[] {
  const where = weekend
    ? `WHERE ${column} IS NOT NULL AND ${column} != '' AND camp_weekend = ?`
    : `WHERE ${column} IS NOT NULL AND ${column} != ''`;
  const params = weekend ? [weekend] : [];

  const rows = sqlite.prepare(`
    SELECT
      ${column} AS name,
      COUNT(*) AS total,
      SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) AS male,
      SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) AS female
    FROM campers
    ${where}
    GROUP BY ${column}
    ORDER BY ${column}
  `).all(...params) as CountRow[];

  return rows;
}

interface DGLCabinRow {
  cabin: string;
  dglName: string;
  smallGroup: string;
  largeGroup: string;
  gender: string;
}

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  const largeGroups = groupCounts("large_group", weekend);
  const smallGroups = groupCounts("small_group", weekend);
  const cabins = groupCounts("cabin_name", weekend);
  const buses = groupCounts("bus_number", weekend);
  const busStops = groupCounts("bus_stop", weekend);

  // Total counts
  const totalWhere = weekend ? "WHERE camp_weekend = ?" : "";
  const totalParams = weekend ? [weekend] : [];
  const totals = sqlite.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) AS male,
      SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) AS female
    FROM campers
    ${totalWhere}
  `).get(...totalParams) as { total: number; male: number; female: number };

  // DGL sleeping cabin breakdown from small_group_info
  let dglCabins: DGLCabinRow[] = [];
  try {
    dglCabins = sqlite.prepare(`
      SELECT
        dgl_cabin AS cabin,
        dgl_first_name || ' ' || dgl_last_name AS dglName,
        small_group AS smallGroup,
        large_group AS largeGroup,
        dgl_gender AS gender
      FROM small_group_info
      WHERE dgl_cabin IS NOT NULL AND dgl_cabin != ''
      ORDER BY dgl_cabin
    `).all() as DGLCabinRow[];
  } catch {
    // table may not exist
  }

  return NextResponse.json({
    totals,
    largeGroups,
    smallGroups,
    cabins,
    buses,
    busStops,
    dglCabins,
  });
}
