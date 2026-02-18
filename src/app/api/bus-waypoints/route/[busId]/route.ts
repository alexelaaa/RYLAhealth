import { NextResponse } from "next/server";
import { db } from "@/db";
import { busWaypoints } from "@/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: { busId: string } }
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { busId } = params;
  const { searchParams } = new URL(request.url);
  const campWeekend = searchParams.get("campWeekend");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions = [eq(busWaypoints.busId, busId)];

  if (campWeekend) {
    conditions.push(eq(busWaypoints.campWeekend, campWeekend));
  }
  if (from) {
    conditions.push(gte(busWaypoints.timestamp, from));
  }
  if (to) {
    conditions.push(lte(busWaypoints.timestamp, to));
  }

  const results = db
    .select()
    .from(busWaypoints)
    .where(and(...conditions))
    .orderBy(asc(busWaypoints.timestamp))
    .all();

  return NextResponse.json(results);
}
