import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  // Use cabin_name if available, fall back to cabin_number
  const conditions = [
    sql`(${campers.cabinName} IS NOT NULL AND ${campers.cabinName} != '' OR ${campers.cabinNumber} IS NOT NULL AND ${campers.cabinNumber} != '')`,
  ];
  if (weekend) {
    conditions.push(eq(campers.campWeekend, weekend));
  }

  const camperList = db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
      gender: campers.gender,
      cabinName: campers.cabinName,
      cabinNumber: campers.cabinNumber,
    })
    .from(campers)
    .where(and(...conditions))
    .all();

  const cabinMap = new Map<string, {
    name: string;
    campers: { id: number; firstName: string; lastName: string; gender: string | null }[];
  }>();

  for (const c of camperList) {
    const cabin = c.cabinName || c.cabinNumber || "";
    if (!cabin) continue;
    if (!cabinMap.has(cabin)) {
      cabinMap.set(cabin, { name: cabin, campers: [] });
    }
    cabinMap.get(cabin)!.campers.push({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      gender: c.gender,
    });
  }

  const cabins = Array.from(cabinMap.values())
    .map((c) => ({
      name: c.name,
      count: c.campers.length,
      campers: c.campers.sort((a, b) => a.lastName.localeCompare(b.lastName)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ cabins });
}
