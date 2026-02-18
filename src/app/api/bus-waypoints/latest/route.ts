import { NextResponse } from "next/server";
import { sqlite } from "@/db";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const campWeekend = searchParams.get("campWeekend");

  let sql = `
    SELECT bw.*
    FROM bus_waypoints bw
    INNER JOIN (
      SELECT bus_id, MAX(timestamp) as max_ts
      FROM bus_waypoints
  `;
  const params: string[] = [];

  if (campWeekend) {
    sql += ` WHERE camp_weekend = ?`;
    params.push(campWeekend);
  }

  sql += `
      GROUP BY bus_id
    ) latest ON bw.bus_id = latest.bus_id AND bw.timestamp = latest.max_ts
    ORDER BY bw.bus_id
  `;

  const rows = sqlite.prepare(sql).all(...params);
  return NextResponse.json(rows);
}
