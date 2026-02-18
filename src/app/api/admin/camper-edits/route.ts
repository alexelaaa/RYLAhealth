import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { camperEdits, campers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const camperId = request.nextUrl.searchParams.get("camperId");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  if (camperId) {
    const edits = db
      .select({
        id: camperEdits.id,
        camperId: camperEdits.camperId,
        fieldName: camperEdits.fieldName,
        oldValue: camperEdits.oldValue,
        newValue: camperEdits.newValue,
        changedBy: camperEdits.changedBy,
        changedAt: camperEdits.changedAt,
        camperFirstName: campers.firstName,
        camperLastName: campers.lastName,
      })
      .from(camperEdits)
      .innerJoin(campers, eq(camperEdits.camperId, campers.id))
      .where(eq(camperEdits.camperId, parseInt(camperId)))
      .orderBy(desc(camperEdits.changedAt))
      .limit(limit)
      .all();

    return NextResponse.json(edits);
  }

  const edits = db
    .select({
      id: camperEdits.id,
      camperId: camperEdits.camperId,
      fieldName: camperEdits.fieldName,
      oldValue: camperEdits.oldValue,
      newValue: camperEdits.newValue,
      changedBy: camperEdits.changedBy,
      changedAt: camperEdits.changedAt,
      camperFirstName: campers.firstName,
      camperLastName: campers.lastName,
    })
    .from(camperEdits)
    .innerJoin(campers, eq(camperEdits.camperId, campers.id))
    .orderBy(desc(camperEdits.changedAt))
    .limit(limit)
    .all();

  return NextResponse.json(edits);
}
