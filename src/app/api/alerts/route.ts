import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campers } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  extractAlerts,
  hasEpiPen,
  hasTimedMedication,
  type MedicalAlertCamper,
} from "@/lib/medical-filters";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  let camperList;
  if (weekend) {
    camperList = db
      .select()
      .from(campers)
      .where(eq(campers.campWeekend, weekend))
      .all();
  } else {
    camperList = db.select().from(campers).all();
  }

  // Extract each category
  const allergies: MedicalAlertCamper[] = extractAlerts(
    camperList,
    "allergies"
  ).map((c) => ({ ...c, hasEpiPen: hasEpiPen(c.value) }));

  const medications: MedicalAlertCamper[] = extractAlerts(
    camperList,
    "currentMedications"
  ).map((c) => {
    const camper = camperList.find((cm) => cm.id === c.id);
    const isOverride = !!(camper?.timedMedicationOverride);
    const isTimed = hasTimedMedication(c.value) || isOverride;
    let schedule: string[] = [];
    if (camper?.medicationSchedule) {
      try { schedule = JSON.parse(camper.medicationSchedule); } catch { /* ignore */ }
    }
    return {
      ...c,
      hasTimed: isTimed,
      isManualOverride: isOverride && !hasTimedMedication(c.value),
      medicationSchedule: schedule.length > 0 ? schedule : undefined,
    };
  });

  const conditions: MedicalAlertCamper[] = extractAlerts(
    camperList,
    "medicalConditions"
  );

  const dietary: MedicalAlertCamper[] = extractAlerts(
    camperList,
    "dietaryRestrictions"
  );

  // Also include campers with timedMedicationOverride but no medications text
  const overrideCampers = camperList.filter(
    (c) => c.timedMedicationOverride && !medications.find((m) => m.id === c.id)
  );
  for (const c of overrideCampers) {
    let schedule: string[] = [];
    if (c.medicationSchedule) {
      try { schedule = JSON.parse(c.medicationSchedule); } catch { /* ignore */ }
    }
    medications.push({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      campWeekend: c.campWeekend,
      value: c.currentMedications || "(manual override)",
      hasTimed: true,
      isManualOverride: true,
      medicationSchedule: schedule.length > 0 ? schedule : undefined,
    });
  }

  const timedMedications = medications.filter((m) => m.hasTimed);

  // Sort: EpiPen carriers first for allergies, timed first for meds
  allergies.sort((a, b) => {
    if (a.hasEpiPen && !b.hasEpiPen) return -1;
    if (!a.hasEpiPen && b.hasEpiPen) return 1;
    return a.lastName.localeCompare(b.lastName);
  });

  medications.sort((a, b) => {
    if (a.hasTimed && !b.hasTimed) return -1;
    if (!a.hasTimed && b.hasTimed) return 1;
    return a.lastName.localeCompare(b.lastName);
  });

  conditions.sort((a, b) => a.lastName.localeCompare(b.lastName));
  dietary.sort((a, b) => a.lastName.localeCompare(b.lastName));

  // Count unique flagged campers
  const flaggedIds = new Set([
    ...allergies.map((c) => c.id),
    ...medications.map((c) => c.id),
    ...conditions.map((c) => c.id),
    ...dietary.map((c) => c.id),
  ]);

  return NextResponse.json({
    allergies,
    medications,
    conditions,
    dietary,
    timedMedications,
    summary: {
      allergies: allergies.length,
      medications: medications.length,
      conditions: conditions.length,
      dietary: dietary.length,
      timedMedications: timedMedications.length,
      totalFlagged: flaggedIds.size,
    },
  });
}
