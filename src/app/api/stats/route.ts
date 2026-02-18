import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db";
import { campers, medicalLogs, behavioralIncidents } from "@/db/schema";
import { sql, eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  const weekendFilter = weekend ? eq(campers.campWeekend, weekend) : undefined;

  // Camper counts by weekend
  const weekendCounts = db
    .select({
      campWeekend: campers.campWeekend,
      count: sql<number>`count(*)`,
    })
    .from(campers)
    .groupBy(campers.campWeekend)
    .all();

  // Camper counts by role
  let roleQuery = db
    .select({
      role: campers.role,
      count: sql<number>`count(*)`,
    })
    .from(campers)
    .$dynamic();
  if (weekendFilter) roleQuery = roleQuery.where(weekendFilter) as typeof roleQuery;
  const roleCounts = roleQuery.groupBy(campers.role).all();

  // Today's logs (filtered by weekend via camper join if needed)
  const today = new Date().toISOString().split("T")[0];

  let todayMedical: { count: number } | undefined;
  let todayBehavioral: { count: number } | undefined;
  let totalMedical: { count: number } | undefined;
  let totalBehavioral: { count: number } | undefined;

  if (weekend) {
    todayMedical = db
      .select({ count: sql<number>`count(*)` })
      .from(medicalLogs)
      .innerJoin(campers, eq(medicalLogs.camperId, campers.id))
      .where(and(sql`${medicalLogs.timestamp} LIKE ${today + "%"}`, eq(campers.campWeekend, weekend)))
      .get();

    todayBehavioral = db
      .select({ count: sql<number>`count(*)` })
      .from(behavioralIncidents)
      .innerJoin(campers, eq(behavioralIncidents.camperId, campers.id))
      .where(and(sql`${behavioralIncidents.timestamp} LIKE ${today + "%"}`, eq(campers.campWeekend, weekend)))
      .get();

    totalMedical = db
      .select({ count: sql<number>`count(*)` })
      .from(medicalLogs)
      .innerJoin(campers, eq(medicalLogs.camperId, campers.id))
      .where(eq(campers.campWeekend, weekend))
      .get();

    totalBehavioral = db
      .select({ count: sql<number>`count(*)` })
      .from(behavioralIncidents)
      .innerJoin(campers, eq(behavioralIncidents.camperId, campers.id))
      .where(eq(campers.campWeekend, weekend))
      .get();
  } else {
    todayMedical = db
      .select({ count: sql<number>`count(*)` })
      .from(medicalLogs)
      .where(sql`${medicalLogs.timestamp} LIKE ${today + "%"}`)
      .get();

    todayBehavioral = db
      .select({ count: sql<number>`count(*)` })
      .from(behavioralIncidents)
      .where(sql`${behavioralIncidents.timestamp} LIKE ${today + "%"}`)
      .get();

    totalMedical = db
      .select({ count: sql<number>`count(*)` })
      .from(medicalLogs)
      .get();

    totalBehavioral = db
      .select({ count: sql<number>`count(*)` })
      .from(behavioralIncidents)
      .get();
  }

  // Recent activity (last 10 entries)
  let recentMedicalQuery = db
    .select({
      id: medicalLogs.id,
      type: sql<string>`'medical'`,
      camperId: medicalLogs.camperId,
      camperFirstName: campers.firstName,
      camperLastName: campers.lastName,
      logType: medicalLogs.type,
      timestamp: medicalLogs.timestamp,
      loggedBy: medicalLogs.loggedBy,
      notes: medicalLogs.notes,
    })
    .from(medicalLogs)
    .innerJoin(campers, eq(medicalLogs.camperId, campers.id))
    .$dynamic();

  if (weekend) {
    recentMedicalQuery = recentMedicalQuery.where(eq(campers.campWeekend, weekend)) as typeof recentMedicalQuery;
  }

  const recentMedical = recentMedicalQuery
    .orderBy(desc(medicalLogs.createdAt))
    .limit(10)
    .all();

  let recentBehavioralQuery = db
    .select({
      id: behavioralIncidents.id,
      type: sql<string>`'behavioral'`,
      camperId: behavioralIncidents.camperId,
      camperFirstName: campers.firstName,
      camperLastName: campers.lastName,
      logType: behavioralIncidents.severity,
      timestamp: behavioralIncidents.timestamp,
      loggedBy: behavioralIncidents.loggedBy,
      notes: behavioralIncidents.description,
    })
    .from(behavioralIncidents)
    .innerJoin(campers, eq(behavioralIncidents.camperId, campers.id))
    .$dynamic();

  if (weekend) {
    recentBehavioralQuery = recentBehavioralQuery.where(eq(campers.campWeekend, weekend)) as typeof recentBehavioralQuery;
  }

  const recentBehavioral = recentBehavioralQuery
    .orderBy(desc(behavioralIncidents.createdAt))
    .limit(10)
    .all();

  const recentActivity = [...recentMedical, ...recentBehavioral]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10);

  // Total campers (filtered)
  let totalQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(campers)
    .$dynamic();
  if (weekendFilter) totalQuery = totalQuery.where(weekendFilter) as typeof totalQuery;
  const totalCampers = totalQuery.get();

  // Check-in counts
  let checkedIn = 0;
  let totalForCheckIn = 0;
  try {
    if (weekend) {
      const checkInResult = sqlite.prepare(
        `SELECT COUNT(*) as cnt FROM check_ins ci
         INNER JOIN campers c ON ci.camper_id = c.id
         WHERE c.camp_weekend = ?`
      ).get(weekend) as { cnt: number } | undefined;
      checkedIn = checkInResult?.cnt || 0;
      totalForCheckIn = totalCampers?.count || 0;
    } else {
      const checkInResult = sqlite.prepare(
        `SELECT COUNT(*) as cnt FROM check_ins`
      ).get() as { cnt: number } | undefined;
      checkedIn = checkInResult?.cnt || 0;
      totalForCheckIn = totalCampers?.count || 0;
    }
  } catch {
    // check_ins table may not exist yet
  }

  // Group & cabin counts
  let largeGroupCount = 0;
  let smallGroupCount = 0;
  let cabinCount = 0;
  try {
    const lgFilter = weekend
      ? `WHERE large_group IS NOT NULL AND large_group != '' AND camp_weekend = ?`
      : `WHERE large_group IS NOT NULL AND large_group != ''`;
    const lgResult = sqlite.prepare(
      `SELECT COUNT(DISTINCT large_group) as cnt FROM campers ${lgFilter}`
    ).get(...(weekend ? [weekend] : [])) as { cnt: number } | undefined;
    largeGroupCount = lgResult?.cnt || 0;

    const sgFilter = weekend
      ? `WHERE small_group IS NOT NULL AND small_group != '' AND camp_weekend = ?`
      : `WHERE small_group IS NOT NULL AND small_group != ''`;
    const sgResult = sqlite.prepare(
      `SELECT COUNT(DISTINCT small_group) as cnt FROM campers ${sgFilter}`
    ).get(...(weekend ? [weekend] : [])) as { cnt: number } | undefined;
    smallGroupCount = sgResult?.cnt || 0;

    const cbFilter = weekend
      ? `WHERE cabin_number IS NOT NULL AND cabin_number != '' AND camp_weekend = ?`
      : `WHERE cabin_number IS NOT NULL AND cabin_number != ''`;
    const cbResult = sqlite.prepare(
      `SELECT COUNT(DISTINCT cabin_number) as cnt FROM campers ${cbFilter}`
    ).get(...(weekend ? [weekend] : [])) as { cnt: number } | undefined;
    cabinCount = cbResult?.cnt || 0;
  } catch {
    // columns may not exist yet
  }

  return NextResponse.json({
    totalCampers: totalCampers?.count || 0,
    weekendCounts,
    roleCounts,
    todayMedicalLogs: todayMedical?.count || 0,
    todayBehavioralIncidents: todayBehavioral?.count || 0,
    totalMedicalLogs: totalMedical?.count || 0,
    totalBehavioralIncidents: totalBehavioral?.count || 0,
    checkedIn,
    totalForCheckIn,
    largeGroupCount,
    smallGroupCount,
    cabinCount,
    recentActivity,
  });
}
