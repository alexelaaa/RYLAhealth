import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import { groupSchoolVariants } from "@/lib/school-cleanup";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const weekend = request.nextUrl.searchParams.get("weekend");

  const filter = weekend
    ? `WHERE school IS NOT NULL AND school != '' AND camp_weekend = ?`
    : `WHERE school IS NOT NULL AND school != ''`;

  const rows = sqlite
    .prepare(
      `SELECT school as name, COUNT(*) as count FROM campers ${filter} GROUP BY school ORDER BY school`
    )
    .all(...(weekend ? [weekend] : [])) as { name: string; count: number }[];

  const grouped = groupSchoolVariants(rows);

  return NextResponse.json({ schools: grouped, totalUnique: rows.length });
}

export async function PATCH(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const mappings: { from: string; to: string }[] = body.mappings;

  if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
    return NextResponse.json({ error: "No mappings provided" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const changedBy = session.label || session.role;
  let totalAffected = 0;

  const updateStmt = sqlite.prepare(
    `UPDATE campers SET school = ?, updated_at = ? WHERE school = ?`
  );
  const selectStmt = sqlite.prepare(
    `SELECT id FROM campers WHERE school = ?`
  );
  const auditStmt = sqlite.prepare(
    `INSERT INTO camper_edits (camper_id, field_name, old_value, new_value, changed_by, changed_at)
     VALUES (?, 'school', ?, ?, ?, ?)`
  );

  const transaction = sqlite.transaction(() => {
    for (const mapping of mappings) {
      if (mapping.from === mapping.to) continue;

      // Get affected camper IDs for audit
      const affected = selectStmt.all(mapping.from) as { id: number }[];
      if (affected.length === 0) continue;

      // Create audit entries
      for (const camper of affected) {
        auditStmt.run(camper.id, mapping.from, mapping.to, changedBy, now);
      }

      // Update school names
      updateStmt.run(mapping.to, now, mapping.from);
      totalAffected += affected.length;
    }
  });

  transaction();

  return NextResponse.json({ success: true, totalAffected });
}
