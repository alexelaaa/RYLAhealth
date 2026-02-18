import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db } from "@/db";
import { campers, camperEdits } from "@/db/schema";
import { like, eq, or, asc, desc, sql } from "drizzle-orm";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const weekend = searchParams.get("weekend");
  const role = searchParams.get("role");
  const sortBy = searchParams.get("sortBy") || "lastName";
  const sortOrder = searchParams.get("sortOrder") || "asc";
  const limit = parseInt(searchParams.get("limit") || "0");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = db.select().from(campers).$dynamic();

  const conditions = [];

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(campers.firstName, term),
        like(campers.lastName, term),
        like(campers.school, term)
      )
    );
  }

  if (weekend) {
    conditions.push(eq(campers.campWeekend, weekend));
  }

  if (role) {
    conditions.push(eq(campers.role, role));
  }

  if (conditions.length > 0) {
    const combined = conditions.reduce((acc, cond) => {
      if (!acc) return cond;
      return sql`${acc} AND ${cond}`;
    });
    if (combined) {
      query = query.where(combined) as typeof query;
    }
  }

  const sortColumn =
    sortBy === "school" ? campers.school :
    sortBy === "firstName" ? campers.firstName :
    campers.lastName;

  query = (sortOrder === "desc"
    ? query.orderBy(desc(sortColumn))
    : query.orderBy(asc(sortColumn))) as typeof query;

  if (limit > 0) {
    query = query.limit(limit).offset(offset) as typeof query;
  }

  const results = query.all();

  // Also get total count for pagination
  const countConditions = [];
  if (search) {
    const term = `%${search}%`;
    countConditions.push(
      or(
        like(campers.firstName, term),
        like(campers.lastName, term),
        like(campers.school, term)
      )
    );
  }
  if (weekend) countConditions.push(eq(campers.campWeekend, weekend));
  if (role) countConditions.push(eq(campers.role, role));

  let countQuery = db.select({ count: sql<number>`count(*)` }).from(campers).$dynamic();
  if (countConditions.length > 0) {
    const combined = countConditions.reduce((acc, cond) => {
      if (!acc) return cond;
      return sql`${acc} AND ${cond}`;
    });
    if (combined) {
      countQuery = countQuery.where(combined) as typeof countQuery;
    }
  }
  const [{ count }] = countQuery.all();

  return NextResponse.json({ campers: results, total: count });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.firstName?.trim() || !body.lastName?.trim() || !body.campWeekend?.trim()) {
    return NextResponse.json(
      { error: "First name, last name, and camp weekend are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const uniqueRegistrationId = `manual-${Date.now()}`;

  const newCamper = {
    uniqueRegistrationId,
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    campWeekend: body.campWeekend.trim(),
    role: body.role?.trim() || "Camper",
    birthDate: body.birthDate || null,
    gender: body.gender || null,
    email: body.email || null,
    cellPhone: body.cellPhone || null,
    addressStreet: body.addressStreet || null,
    addressCity: body.addressCity || null,
    addressState: body.addressState || null,
    addressZip: body.addressZip || null,
    school: body.school || null,
    gradeLevel: body.gradeLevel || null,
    guardianFirstName: body.guardianFirstName || null,
    guardianLastName: body.guardianLastName || null,
    guardianEmail: body.guardianEmail || null,
    guardianPhone: body.guardianPhone || null,
    emergencyFirstName: body.emergencyFirstName || null,
    emergencyLastName: body.emergencyLastName || null,
    emergencyRelationship: body.emergencyRelationship || null,
    emergencyPhone: body.emergencyPhone || null,
    dietaryRestrictions: body.dietaryRestrictions || null,
    allergies: body.allergies || null,
    currentMedications: body.currentMedications || null,
    medicalConditions: body.medicalConditions || null,
    recentInjuries: body.recentInjuries || null,
    physicalLimitations: body.physicalLimitations || null,
    lastTetanusShot: body.lastTetanusShot || null,
    otherMedicalNeeds: body.otherMedicalNeeds || null,
    largeGroup: body.largeGroup || null,
    smallGroup: body.smallGroup || null,
    cabinNumber: body.cabinNumber || null,
    busNumber: body.busNumber || null,
    createdAt: now,
    updatedAt: now,
  };

  const result = db.insert(campers).values(newCamper).run();
  const camperId = Number(result.lastInsertRowid);

  // Create audit entry
  db.insert(camperEdits).values({
    camperId,
    fieldName: "__created",
    oldValue: null,
    newValue: `Manual entry by ${session.label || session.role}`,
    changedBy: session.label || session.role,
    changedAt: now,
  }).run();

  const camper = db.select().from(campers).where(eq(campers.id, camperId)).get();

  return NextResponse.json({ camper }, { status: 201 });
}
