import { NextResponse } from "next/server";
import { sqlite } from "@/db";

interface DistinctRow {
  val: string;
}

function getDistinct(column: string, table = "campers"): string[] {
  try {
    const rows = sqlite
      .prepare(`SELECT DISTINCT ${column} AS val FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != '' ORDER BY ${column}`)
      .all() as DistinctRow[];
    return rows.map((r) => r.val);
  } catch {
    return [];
  }
}

export async function GET() {
  // Also pull small_group → large_group mapping for cascading dropdowns
  const groupMapping: Record<string, string> = {};
  try {
    const rows = sqlite
      .prepare(`SELECT small_group, large_group FROM small_group_info WHERE large_group IS NOT NULL`)
      .all() as { small_group: string; large_group: string }[];
    for (const r of rows) {
      groupMapping[r.small_group] = r.large_group;
    }
  } catch {
    // table may not exist
  }

  // Bus stop → location/address combos
  let busStopCombos: { stop: string; location: string; address: string }[] = [];
  try {
    const rows = sqlite.prepare(`
      SELECT DISTINCT bus_stop, bus_stop_location, bus_stop_address
      FROM campers
      WHERE bus_stop IS NOT NULL AND bus_stop != ''
      ORDER BY bus_stop
    `).all() as { bus_stop: string; bus_stop_location: string | null; bus_stop_address: string | null }[];
    busStopCombos = rows.map((r) => ({
      stop: r.bus_stop,
      location: r.bus_stop_location || "",
      address: r.bus_stop_address || "",
    }));
  } catch {
    // ignore
  }

  // Merge small groups from both campers table and small_group_info table
  const camperSmallGroups = getDistinct("small_group");
  let infoSmallGroups: string[] = [];
  let infoLargeGroups: string[] = [];
  let infoCabins: string[] = [];
  try {
    const sgRows = sqlite.prepare(`SELECT DISTINCT small_group AS val FROM small_group_info WHERE small_group IS NOT NULL AND small_group != '' ORDER BY small_group`).all() as DistinctRow[];
    infoSmallGroups = sgRows.map((r) => r.val);
    const lgRows = sqlite.prepare(`SELECT DISTINCT large_group AS val FROM small_group_info WHERE large_group IS NOT NULL AND large_group != '' ORDER BY large_group`).all() as DistinctRow[];
    infoLargeGroups = lgRows.map((r) => r.val);
    const cabinRows = sqlite.prepare(`SELECT DISTINCT dgl_cabin AS val FROM small_group_info WHERE dgl_cabin IS NOT NULL AND dgl_cabin != '' ORDER BY dgl_cabin`).all() as DistinctRow[];
    infoCabins = cabinRows.map((r) => r.val);
  } catch {
    // table may not exist
  }

  const mergedSmallGroups = Array.from(new Set([...camperSmallGroups, ...infoSmallGroups])).sort();
  const mergedLargeGroups = Array.from(new Set([...getDistinct("large_group"), ...infoLargeGroups])).sort();
  const mergedCabins = Array.from(new Set([...getDistinct("cabin_name"), ...infoCabins])).sort();

  return NextResponse.json({
    largeGroups: mergedLargeGroups,
    smallGroups: mergedSmallGroups,
    cabinNames: mergedCabins,
    busNumbers: getDistinct("bus_number"),
    busStops: getDistinct("bus_stop"),
    busStopLocations: getDistinct("bus_stop_location"),
    busStopAddresses: getDistinct("bus_stop_address"),
    groupMapping,
    busStopCombos,
  });
}
