import { NextResponse } from "next/server";
import { db } from "@/db";
import { busWaypoints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Accept single waypoint or { waypoints: [...] }
  const waypoints: Array<{
    busId: string;
    busLabel: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    campWeekend?: string;
    clientId?: string;
    timestamp: string;
  }> = Array.isArray(body.waypoints) ? body.waypoints : [body];

  const inserted = [];

  for (const wp of waypoints) {
    if (!wp.busId || !wp.busLabel || wp.latitude == null || wp.longitude == null || !wp.timestamp) {
      continue;
    }

    // Dedup by clientId
    if (wp.clientId) {
      const existing = db
        .select()
        .from(busWaypoints)
        .where(eq(busWaypoints.clientId, wp.clientId))
        .get();
      if (existing) {
        inserted.push(existing);
        continue;
      }
    }

    const result = db
      .insert(busWaypoints)
      .values({
        busId: wp.busId,
        busLabel: wp.busLabel,
        latitude: wp.latitude,
        longitude: wp.longitude,
        accuracy: wp.accuracy ?? null,
        heading: wp.heading ?? null,
        speed: wp.speed ?? null,
        trackedBy: session.label || "Unknown",
        campWeekend: wp.campWeekend || session.campWeekend || null,
        clientId: wp.clientId || null,
        timestamp: wp.timestamp,
      })
      .returning()
      .get();

    inserted.push(result);
  }

  return NextResponse.json({ inserted: inserted.length, waypoints: inserted }, { status: 201 });
}
