import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { sqlite } from "@/db";
import Papa from "papaparse";

function str(val: string | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const confirm = formData.get("confirm") === "true";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string | undefined>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  // Filter to rows that have a Small Group name
  const validRows = parsed.data.filter((row) => str(row["Small Group"]));

  if (!confirm) {
    return NextResponse.json({
      preview: true,
      totalParsed: validRows.length,
    });
  }

  const now = new Date().toISOString();

  const upsertStmt = sqlite.prepare(`
    INSERT INTO small_group_info (
      group_number, small_group, large_group, meeting_location,
      dgl_first_name, dgl_last_name, dgl_cabin, dgl_gender,
      camper_count, male_count, female_count, camp_weekend, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(small_group) DO UPDATE SET
      group_number=excluded.group_number, large_group=excluded.large_group,
      meeting_location=excluded.meeting_location,
      dgl_first_name=excluded.dgl_first_name, dgl_last_name=excluded.dgl_last_name,
      dgl_cabin=excluded.dgl_cabin, dgl_gender=excluded.dgl_gender,
      camper_count=excluded.camper_count, male_count=excluded.male_count,
      female_count=excluded.female_count, camp_weekend=excluded.camp_weekend
  `);

  let imported = 0;
  const tx = sqlite.transaction(() => {
    // Clear existing group info
    sqlite.prepare("DELETE FROM small_group_info").run();

    for (const row of validRows) {
      const keys = Object.keys(row);
      // First column is unnamed group number
      const groupNumber = parseInt(str(row[""] || row[keys[0]])) || null;

      upsertStmt.run(
        groupNumber,
        str(row["Small Group"]),
        str(row["Large Group"]) || null,
        str(row["Meeting Location"]) || null,
        str(row["First"]) || null,
        str(row["Last"]) || null,
        str(row["DGL Sleeping"]) || null,
        str(row["DGL Gender"]) || null,
        parseInt(str(row["Count"])) || null,
        parseInt(str(row["Male"])) || null,
        parseInt(str(row["Female"])) || null,
        "March 6th-8th",
        now,
      );
      imported++;
    }
  });

  tx();

  return NextResponse.json({
    success: true,
    imported,
  });
}
