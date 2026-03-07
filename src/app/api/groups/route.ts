import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db";
import { campers } from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { normalizeCabinPrefix, camperMatchesCabin } from "@/lib/cabin-utils";

interface SmallGroupInfoRow {
  small_group: string;
  large_group: string | null;
  meeting_location: string | null;
  dgl_first_name: string | null;
  dgl_last_name: string | null;
  dgl_cabin: string | null;
  dgl_gender: string | null;
}

function loadGroupInfo(): Map<string, {
  largeGroup: string | null;
  meetingLocation: string | null;
  dglName: string | null;
  dglCabin: string | null;
  dglGender: string | null;
}> {
  const map = new Map();
  try {
    const rows = sqlite.prepare(
      `SELECT small_group, large_group, meeting_location, dgl_first_name, dgl_last_name, dgl_cabin, dgl_gender FROM small_group_info`
    ).all() as SmallGroupInfoRow[];
    for (const row of rows) {
      const dglName = row.dgl_first_name && row.dgl_last_name
        ? `${row.dgl_first_name} ${row.dgl_last_name}`
        : null;
      map.set(row.small_group, {
        largeGroup: row.large_group,
        meetingLocation: row.meeting_location,
        dglName,
        dglCabin: row.dgl_cabin,
        dglGender: row.dgl_gender,
      });
    }
  } catch {
    // small_group_info table may not exist yet
  }
  return map;
}

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");
  const type = request.nextUrl.searchParams.get("type") || "large";

  const groupInfoMap = loadGroupInfo();

  if (type === "overview") {
    return handleOverview(weekend, groupInfoMap);
  }

  if (type === "dgl-cabins") {
    return handleDGLCabins(weekend);
  }

  const groupCol = type === "small" ? campers.smallGroup : campers.largeGroup;

  const conditions = [isNotNull(groupCol), sql`${groupCol} != ''`, eq(campers.noShow, 0), eq(campers.sentHome, 0)];
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
    .map((g) => {
      const info = type === "small" ? groupInfoMap.get(g.name) : undefined;
      return {
        name: g.name,
        count: g.campers.length,
        smallGroups: type === "large" ? Array.from(g.smallGroups).sort() : undefined,
        meetingLocation: info?.meetingLocation || null,
        dglName: info?.dglName || null,
        dglCabin: info?.dglCabin || null,
        dglGender: info?.dglGender || null,
        campers: g.campers.sort((a, b) => a.lastName.localeCompare(b.lastName)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ groups });
}

function handleOverview(
  weekend: string | null,
  groupInfoMap: Map<string, {
    largeGroup: string | null;
    meetingLocation: string | null;
    dglName: string | null;
    dglCabin: string | null;
    dglGender: string | null;
  }>
) {
  const conditions = [isNotNull(campers.smallGroup), sql`${campers.smallGroup} != ''`, eq(campers.noShow, 0), eq(campers.sentHome, 0)];
  if (weekend) {
    conditions.push(eq(campers.campWeekend, weekend));
  }

  const camperList = db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
      gender: campers.gender,
      largeGroup: campers.largeGroup,
      smallGroup: campers.smallGroup,
      cabinName: campers.cabinName,
    })
    .from(campers)
    .where(and(...conditions))
    .all();

  // Build: largeGroup → smallGroup → campers
  const largeGroupMap = new Map<string, Map<string, {
    id: number;
    firstName: string;
    lastName: string;
    gender: string | null;
    cabinName: string | null;
  }[]>>();

  for (const c of camperList) {
    const lg = c.largeGroup || "Unassigned";
    const sg = c.smallGroup!;

    if (!largeGroupMap.has(lg)) {
      largeGroupMap.set(lg, new Map());
    }
    const sgMap = largeGroupMap.get(lg)!;
    if (!sgMap.has(sg)) {
      sgMap.set(sg, []);
    }
    sgMap.get(sg)!.push({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      gender: c.gender,
      cabinName: c.cabinName,
    });
  }

  const largeGroups = Array.from(largeGroupMap.entries())
    .map(([lgName, sgMap]) => {
      const smallGroups = Array.from(sgMap.entries())
        .map(([sgName, sgCampers]) => {
          const info = groupInfoMap.get(sgName);
          return {
            name: sgName,
            count: sgCampers.length,
            dglName: info?.dglName || null,
            dglCabin: info?.dglCabin || null,
            dglGender: info?.dglGender || null,
            meetingLocation: info?.meetingLocation || null,
            campers: sgCampers.sort((a, b) => a.lastName.localeCompare(b.lastName)),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const totalCampers = smallGroups.reduce((sum, sg) => sum + sg.count, 0);

      return {
        name: lgName,
        count: totalCampers,
        smallGroups,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ largeGroups });
}

// normalizeCabinPrefix and camperMatchesCabin imported from @/lib/cabin-utils

function handleDGLCabins(weekend: string | null) {
  // Load all DGL info
  let dglRows: SmallGroupInfoRow[] = [];
  try {
    dglRows = sqlite.prepare(
      `SELECT small_group, large_group, meeting_location, dgl_first_name, dgl_last_name, dgl_cabin, dgl_gender
       FROM small_group_info WHERE dgl_cabin IS NOT NULL AND dgl_cabin != ''`
    ).all() as SmallGroupInfoRow[];
  } catch {
    return NextResponse.json({ dglCabins: [] });
  }

  // Load all campers with cabin assignments (exclude no-shows)
  const conditions = [isNotNull(campers.cabinName), sql`${campers.cabinName} != ''`, eq(campers.noShow, 0), eq(campers.sentHome, 0)];
  if (weekend) {
    conditions.push(eq(campers.campWeekend, weekend));
  }

  const allCampers = db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
      gender: campers.gender,
      cabinName: campers.cabinName,
      smallGroup: campers.smallGroup,
    })
    .from(campers)
    .where(and(...conditions))
    .all();

  // Build DGL cabin entries with matched students
  const dglCabins = dglRows.map((dgl) => {
    const dglName = dgl.dgl_first_name && dgl.dgl_last_name
      ? `${dgl.dgl_first_name} ${dgl.dgl_last_name}`
      : null;

    // Match students using shared cabin matching utility
    const students = allCampers
      .filter((c) => camperMatchesCabin(c.cabinName!, dgl.dgl_cabin!))
      .map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        gender: c.gender,
        cabinName: c.cabinName,
        smallGroup: c.smallGroup,
      }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    return {
      dglName,
      dglCabin: dgl.dgl_cabin,
      dglGender: dgl.dgl_gender,
      smallGroup: dgl.small_group,
      largeGroup: dgl.large_group,
      studentCount: students.length,
      students,
    };
  }).sort((a, b) => {
    const ca = normalizeCabinPrefix(a.dglCabin || "");
    const cb = normalizeCabinPrefix(b.dglCabin || "");
    return ca.localeCompare(cb, undefined, { numeric: true });
  });

  return NextResponse.json({ dglCabins });
}
