import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { camperEdits, campers } from "@/db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";

const MOVEMENT_FIELDS = [
  "cabinName", "cabinNumber", "cabinLocation", "smallGroup", "largeGroup",
  "busNumber", "campWeekend", "noShow", "__created", "__deleted",
];

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
    camperFirstName: sql<string>`COALESCE(${campers.firstName}, ${camperEdits.oldValue})`.as("camperFirstName"),
    camperLastName: sql<string>`COALESCE(${campers.lastName}, '')`.as("camperLastName"),
  };

  let query = db
    .select(selectFields)
    .from(camperEdits)
    .leftJoin(campers, eq(camperEdits.camperId, campers.id))
    .$dynamic();

  const conditions = [];

  if (camperId) {
    conditions.push(eq(camperEdits.camperId, parseInt(camperId)));
  }

  if (filter === "movements") {
    conditions.push(inArray(camperEdits.fieldName, MOVEMENT_FIELDS));
  } else if (filter === "deleted") {
    conditions.push(eq(camperEdits.fieldName, "__deleted"));
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

  // For __deleted entries, the camper row is gone, so parse the name from oldValue
  const enriched = edits.map((e) => {
    if (e.fieldName === "__deleted" && !e.camperLastName) {
      const nameParts = (e.oldValue || "").split(" ");
      return {
        ...e,
        camperFirstName: nameParts[0] || "Unknown",
        camperLastName: nameParts.slice(1).join(" ") || "",
      };
    }
    return e;
  });

  return NextResponse.json(enriched);
}
