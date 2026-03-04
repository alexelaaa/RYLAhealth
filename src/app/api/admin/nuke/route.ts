import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { sqlite } from "@/db";

export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const results: Record<string, number> = {};

  const tables = [
    "campers",
    "check_ins",
    "medical_logs",
    "behavioral_incidents",
    "camper_edits",
    "small_group_info",
    "camp_staff",
    "bus_waypoints",
  ];

  for (const table of tables) {
    try {
      const r = sqlite.prepare(`DELETE FROM ${table}`).run();
      results[table] = r.changes;
    } catch {
      results[table] = -1; // table doesn't exist
    }
  }

  return NextResponse.json({ success: true, deleted: results });
}
