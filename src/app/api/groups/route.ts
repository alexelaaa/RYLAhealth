import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campers } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");
  const type = request.nextUrl.searchParams.get("type") || "large";

  const groupCol = type === "small" ? campers.smallGroup : campers.largeGroup;

  const conditions = [isNotNull(groupCol), sql`${groupCol} != ''`];
  if (weekend) {
    conditions.push(eq(campers.campWeekend, weekend));
  }

  const camperList = db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
      largeGroup: campers.largeGroup,
      smallGroup: campers.smallGroup,
    })
    .from(campers)
    .where(and(...conditions))
    .all();

  // Group campers
  const groupMap = new Map<string, {
    name: string;
    campers: { id: number; firstName: string; lastName: string }[];
    smallGroups: Set<string>;
  }>();

  for (const c of camperList) {
    const groupName = type === "small" ? c.smallGroup! : c.largeGroup!;
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, { name: groupName, campers: [], smallGroups: new Set() });
    }
    const group = groupMap.get(groupName)!;
    group.campers.push({ id: c.id, firstName: c.firstName, lastName: c.lastName });
    if (type === "large" && c.smallGroup) {
      group.smallGroups.add(c.smallGroup);
    }
  }

  const groups = Array.from(groupMap.values())
    .map((g) => ({
      name: g.name,
      count: g.campers.length,
      smallGroups: type === "large" ? Array.from(g.smallGroups).sort() : undefined,
      campers: g.campers.sort((a, b) => a.lastName.localeCompare(b.lastName)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ groups });
}
