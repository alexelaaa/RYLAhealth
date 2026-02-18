import { NextResponse } from "next/server";
import { db } from "@/db";
import { behavioralIncidents, campers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const camperId = searchParams.get("camperId");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = db
    .select({
      id: behavioralIncidents.id,
      camperId: behavioralIncidents.camperId,
      camperFirstName: campers.firstName,
      camperLastName: campers.lastName,
      timestamp: behavioralIncidents.timestamp,
      staffName: behavioralIncidents.staffName,
      description: behavioralIncidents.description,
      severity: behavioralIncidents.severity,
      loggedBy: behavioralIncidents.loggedBy,
      clientId: behavioralIncidents.clientId,
      createdAt: behavioralIncidents.createdAt,
    })
    .from(behavioralIncidents)
    .innerJoin(campers, eq(behavioralIncidents.camperId, campers.id))
    .orderBy(desc(behavioralIncidents.timestamp))
    .limit(limit)
    .$dynamic();

  if (camperId) {
    query = query.where(
      eq(behavioralIncidents.camperId, parseInt(camperId))
    ) as typeof query;
  }

  const results = query.all();
  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const body = await request.json();

  const { camperId, timestamp, staffName, description, severity, clientId } = body;

  if (!camperId || !timestamp || !staffName || !description || !severity) {
    return NextResponse.json(
      { error: "camperId, timestamp, staffName, description, and severity are required" },
      { status: 400 }
    );
  }

  // Dedup by clientId
  if (clientId) {
    const existing = db
      .select()
      .from(behavioralIncidents)
      .where(eq(behavioralIncidents.clientId, clientId))
      .get();
    if (existing) {
      return NextResponse.json(existing);
    }
  }

  const result = db
    .insert(behavioralIncidents)
    .values({
      camperId: parseInt(camperId),
      timestamp,
      staffName,
      description,
      severity,
      loggedBy: session.label || "Unknown",
      clientId: clientId || null,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
