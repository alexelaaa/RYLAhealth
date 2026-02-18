import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campers } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  const conditions = [isNotNull(campers.cabinNumber), sql`${campers.cabinNumber} != ''`];
  if (weekend) {
    conditions.push(eq(campers.campWeekend, weekend));
  }

  const camperList = db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
      gender: campers.gender,
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
    const cabin = c.cabinNumber!;
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
