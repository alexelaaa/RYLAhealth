import { NextResponse } from "next/server";
import { sqlite } from "@/db";
import {
  LARGE_GROUPS,
  ALL_SMALL_GROUPS,
  SMALL_GROUPS,
  CABIN_NAMES,
  BUS_NUMBERS,
} from "@/lib/constants";

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
  // Build group mapping from hardcoded constants + DB
  const groupMapping: Record<string, string> = {};
  // Hardcoded mapping
  for (const [lg, sgs] of Object.entries(SMALL_GROUPS)) {
    for (const sg of sgs) {
      groupMapping[sg] = lg;
    }
  }
  // Overlay any DB overrides from small_group_info
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

  // Bus stop → location/address combos (from DB only)
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

  // Merge hardcoded + DB values (hardcoded ensures they're always present)
  const mergedSmallGroups = Array.from(new Set([...ALL_SMALL_GROUPS, ...getDistinct("small_group")])).sort();
  const mergedLargeGroups = Array.from(new Set([...LARGE_GROUPS, ...getDistinct("large_group")])).sort();
  const mergedCabins = Array.from(new Set([...CABIN_NAMES, ...getDistinct("cabin_name")])).sort();
  const mergedBusNumbers = Array.from(new Set([...BUS_NUMBERS, ...getDistinct("bus_number")])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return NextResponse.json({
    largeGroups: mergedLargeGroups,
    smallGroups: mergedSmallGroups,
    cabinNames: mergedCabins,
    busNumbers: mergedBusNumbers,
    busStops: getDistinct("bus_stop"),
    busStopLocations: getDistinct("bus_stop_location"),
    busStopAddresses: getDistinct("bus_stop_address"),
    groupMapping,
    busStopCombos,
  });
}
