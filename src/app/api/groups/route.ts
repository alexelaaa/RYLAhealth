import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db";
import { campers } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

interface SmallGroupInfoRow {
  small_group: string;
  meeting_location: string | null;
  dgl_first_name: string | null;
  dgl_last_name: string | null;
}

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

  // Load small_group_info for meeting locations and DGL info
  const groupInfoMap = new Map<string, { meetingLocation: string | null; dglName: string | null }>();
  try {
    const infoRows = sqlite.prepare(
      `SELECT small_group, meeting_location, dgl_first_name, dgl_last_name FROM small_group_info`
    ).all() as SmallGroupInfoRow[];
    for (const row of infoRows) {
      const dglName = row.dgl_first_name && row.dgl_last_name
        ? `${row.dgl_first_name} ${row.dgl_last_name}`
        : null;
      groupInfoMap.set(row.small_group, {
        meetingLocation: row.meeting_location,
        dglName,
      });
    }
  } catch {
    // small_group_info table may not exist yet
  }

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
    .map((g) => {
      const info = type === "small" ? groupInfoMap.get(g.name) : undefined;
      return {
        name: g.name,
        count: g.campers.length,
        smallGroups: type === "large" ? Array.from(g.smallGroups).sort() : undefined,
        meetingLocation: info?.meetingLocation || null,
        dglName: info?.dglName || null,
        campers: g.campers.sort((a, b) => a.lastName.localeCompare(b.lastName)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ groups });
}
