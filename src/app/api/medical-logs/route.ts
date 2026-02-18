import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicalLogs, campers } from "@/db/schema";
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
      id: medicalLogs.id,
      camperId: medicalLogs.camperId,
      camperFirstName: campers.firstName,
      camperLastName: campers.lastName,
      timestamp: medicalLogs.timestamp,
      type: medicalLogs.type,
      medication: medicalLogs.medication,
      dosage: medicalLogs.dosage,
      treatment: medicalLogs.treatment,
      notes: medicalLogs.notes,
      loggedBy: medicalLogs.loggedBy,
      clientId: medicalLogs.clientId,
      createdAt: medicalLogs.createdAt,
    })
    .from(medicalLogs)
    .innerJoin(campers, eq(medicalLogs.camperId, campers.id))
    .orderBy(desc(medicalLogs.timestamp))
    .limit(limit)
    .$dynamic();

  if (camperId) {
    query = query.where(eq(medicalLogs.camperId, parseInt(camperId))) as typeof query;
  }

  const results = query.all();
  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const body = await request.json();

  const { camperId, timestamp, type, medication, dosage, treatment, notes, clientId } = body;

  if (!camperId || !timestamp || !type) {
    return NextResponse.json(
      { error: "camperId, timestamp, and type are required" },
      { status: 400 }
    );
  }

  // Dedup by clientId
  if (clientId) {
    const existing = db
      .select()
      .from(medicalLogs)
      .where(eq(medicalLogs.clientId, clientId))
      .get();
    if (existing) {
      return NextResponse.json(existing);
    }
  }

  const result = db
    .insert(medicalLogs)
    .values({
      camperId: parseInt(camperId),
      timestamp,
      type,
      medication: medication || null,
      dosage: dosage || null,
      treatment: treatment || null,
      notes: notes || null,
      loggedBy: session.label || "Unknown",
      clientId: clientId || null,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
