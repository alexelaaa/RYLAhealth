import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import { parseSupplementaryExcel } from "@/lib/supplementary-parser";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const mode = formData.get("mode") as string || "preview";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const records = parseSupplementaryExcel(buffer);

  if (records.length === 0) {
    return NextResponse.json({ error: "No records found in file" }, { status: 400 });
  }

  // Match records against existing campers
  type MatchResult = {
    identifier: string;
    camperId: number | null;
    camperName: string;
    matched: boolean;
    largeGroup: string;
    smallGroup: string;
    cabinNumber: string;
    busNumber: string;
  };

  const results: MatchResult[] = [];

  for (const record of records) {
    // Try matching by uniqueRegistrationId first
    let camper = sqlite.prepare(
      "SELECT id, first_name, last_name FROM campers WHERE unique_registration_id = ?"
    ).get(record.identifier) as { id: number; first_name: string; last_name: string } | undefined;

    // Fallback: try name match
    if (!camper && record.firstName && record.lastName) {
      camper = sqlite.prepare(
        "SELECT id, first_name, last_name FROM campers WHERE first_name = ? AND last_name = ? LIMIT 1"
      ).get(record.firstName, record.lastName) as { id: number; first_name: string; last_name: string } | undefined;
    }

    results.push({
      identifier: record.identifier,
      camperId: camper?.id || null,
      camperName: camper ? `${camper.first_name} ${camper.last_name}` : "",
      matched: !!camper,
      largeGroup: record.largeGroup,
      smallGroup: record.smallGroup,
      cabinNumber: record.cabinNumber,
      busNumber: record.busNumber,
    });
  }

  const matched = results.filter((r) => r.matched);
  const unmatched = results.filter((r) => !r.matched);

  if (mode === "preview") {
    return NextResponse.json({
      total: records.length,
      matched: matched.length,
      unmatched: unmatched.length,
      unmatchedRecords: unmatched.map((r) => r.identifier),
      preview: true,
    });
  }

  // Confirm mode: apply updates
  const updateStmt = sqlite.prepare(`
    UPDATE campers SET
      large_group = ?,
      small_group = ?,
      cabin_number = ?,
      bus_number = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  let updated = 0;

  const applyAll = sqlite.transaction(() => {
    for (const result of matched) {
      if (result.camperId) {
        updateStmt.run(
          result.largeGroup || null,
          result.smallGroup || null,
          result.cabinNumber || null,
          result.busNumber || null,
          now,
          result.camperId
        );
        updated++;
      }
    }
  });

  applyAll();

  return NextResponse.json({
    total: records.length,
    matched: matched.length,
    unmatched: unmatched.length,
    updated,
    unmatchedRecords: unmatched.map((r) => r.identifier),
    preview: false,
  });
}
