import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { camperEdits, campers } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

const MOVEMENT_FIELDS = ["cabinName", "cabinNumber", "cabinLocation", "smallGroup", "largeGroup", "noShow"];

export async function GET(request: NextRequest) {
  const camperId = request.nextUrl.searchParams.get("camperId");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
  const filter = request.nextUrl.searchParams.get("filter");

  const selectFields = {
    id: camperEdits.id,
    camperId: camperEdits.camperId,
    fieldName: camperEdits.fieldName,
    oldValue: camperEdits.oldValue,
    newValue: camperEdits.newValue,
    changedBy: camperEdits.changedBy,
    changedAt: camperEdits.changedAt,
    camperFirstName: campers.firstName,
    camperLastName: campers.lastName,
  };

  let query = db
    .select(selectFields)
    .from(camperEdits)
    .innerJoin(campers, eq(camperEdits.camperId, campers.id))
    .$dynamic();

  const conditions = [];

  if (camperId) {
    conditions.push(eq(camperEdits.camperId, parseInt(camperId)));
  }

  if (filter === "movements") {
    conditions.push(inArray(camperEdits.fieldName, MOVEMENT_FIELDS));
  }

  if (conditions.length === 1) {
    query = query.where(conditions[0]) as typeof query;
  } else if (conditions.length === 2) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(conditions[0], conditions[1])) as typeof query;
  }

  const edits = query
    .orderBy(desc(camperEdits.changedAt))
    .limit(limit)
    .all();

  return NextResponse.json(edits);
}
