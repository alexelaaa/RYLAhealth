import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { db, sqlite } from "@/db";
import { campers } from "@/db/schema";
import { parseRegistrationCsv } from "@/lib/csv-parser";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const confirm = formData.get("confirm") === "true";
  const replaceAll = formData.get("replaceAll") === "true";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = parseRegistrationCsv(text);

  if (!confirm) {
    // Preview mode: match by first_name + last_name
    const existing = db
      .select({
        firstName: campers.firstName,
        lastName: campers.lastName,
      })
      .from(campers)
      .all();
    const existingNames = new Set(
      existing.map((c) => `${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`)
    );

    const newRecords = parsed.filter(
      (c) => !existingNames.has(`${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`)
    );
    const updateRecords = parsed.filter(
      (c) => existingNames.has(`${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`)
    );

    return NextResponse.json({
      preview: true,
      totalParsed: parsed.length,
      newCount: newRecords.length,
      updateCount: updateRecords.length,
    });
  }

  // Actual import with upsert
  let inserted = 0;
  let updated = 0;

  const upsertStmt = sqlite.prepare(`
    INSERT INTO campers (
      unique_registration_id, first_name, last_name, birth_date, gender, email,
      cell_phone, address_street, address_city, address_state, address_zip,
      school, grade_level,
      guardian_first_name, guardian_last_name, guardian_email, guardian_phone,
      emergency_first_name, emergency_last_name, emergency_relationship, emergency_phone,
      sponsoring_rotary_club,
      camp_weekend, role, has_relative_attending,
      relative_first_name, relative_last_name, relative_role,
      dietary_restrictions, allergies, current_medications, medical_conditions,
      recent_injuries, physical_limitations, last_tetanus_shot, other_medical_needs,
      has_insurance, insurance_provider, policy_number,
      insured_first_name, insured_last_name, insurance_phone,
      first_aid_permission, otc_medication_permission,
      large_group, small_group, cabin_name, cabin_location,
      bus_stop, bus_stop_location, bus_stop_address, pickup_time, dropoff_time,
      bus_number, created_at, updated_at
    ) VALUES (
      @uniqueRegistrationId, @firstName, @lastName, @birthDate, @gender, @email,
      @cellPhone, @addressStreet, @addressCity, @addressState, @addressZip,
      @school, @gradeLevel,
      @guardianFirstName, @guardianLastName, @guardianEmail, @guardianPhone,
      @emergencyFirstName, @emergencyLastName, @emergencyRelationship, @emergencyPhone,
      @sponsoringRotaryClub,
      @campWeekend, @role, @hasRelativeAttending,
      @relativeFirstName, @relativeLastName, @relativeRole,
      @dietaryRestrictions, @allergies, @currentMedications, @medicalConditions,
      @recentInjuries, @physicalLimitations, @lastTetanusShot, @otherMedicalNeeds,
      @hasInsurance, @insuranceProvider, @policyNumber,
      @insuredFirstName, @insuredLastName, @insurancePhone,
      @firstAidPermission, @otcMedicationPermission,
      @largeGroup, @smallGroup, @cabinName, @cabinLocation,
      @busStop, @busStopLocation, @busStopAddress, @pickupTime, @dropoffTime,
      @busNumber, @createdAt, @updatedAt
    ) ON CONFLICT(unique_registration_id) DO UPDATE SET
      first_name=excluded.first_name, last_name=excluded.last_name,
      birth_date=excluded.birth_date, gender=excluded.gender, email=excluded.email,
      cell_phone=excluded.cell_phone,
      address_street=excluded.address_street, address_city=excluded.address_city,
      address_state=excluded.address_state, address_zip=excluded.address_zip,
      school=excluded.school, grade_level=excluded.grade_level,
      guardian_first_name=excluded.guardian_first_name, guardian_last_name=excluded.guardian_last_name,
      guardian_email=excluded.guardian_email, guardian_phone=excluded.guardian_phone,
      emergency_first_name=excluded.emergency_first_name, emergency_last_name=excluded.emergency_last_name,
      emergency_relationship=excluded.emergency_relationship, emergency_phone=excluded.emergency_phone,
      sponsoring_rotary_club=excluded.sponsoring_rotary_club,
      camp_weekend=excluded.camp_weekend, role=excluded.role,
      has_relative_attending=excluded.has_relative_attending,
      relative_first_name=excluded.relative_first_name, relative_last_name=excluded.relative_last_name,
      relative_role=excluded.relative_role,
      dietary_restrictions=excluded.dietary_restrictions,
      allergies=excluded.allergies, current_medications=excluded.current_medications,
      medical_conditions=excluded.medical_conditions,
      recent_injuries=excluded.recent_injuries, physical_limitations=excluded.physical_limitations,
      last_tetanus_shot=excluded.last_tetanus_shot, other_medical_needs=excluded.other_medical_needs,
      has_insurance=excluded.has_insurance, insurance_provider=excluded.insurance_provider,
      policy_number=excluded.policy_number,
      insured_first_name=excluded.insured_first_name, insured_last_name=excluded.insured_last_name,
      insurance_phone=excluded.insurance_phone,
      first_aid_permission=excluded.first_aid_permission,
      otc_medication_permission=excluded.otc_medication_permission,
      large_group=excluded.large_group, small_group=excluded.small_group,
      cabin_name=excluded.cabin_name, cabin_location=excluded.cabin_location,
      bus_stop=excluded.bus_stop, bus_stop_location=excluded.bus_stop_location,
      bus_stop_address=excluded.bus_stop_address, pickup_time=excluded.pickup_time,
      dropoff_time=excluded.dropoff_time, bus_number=excluded.bus_number,
      updated_at=excluded.updated_at
  `);

  const now = new Date().toISOString();
  let deleted = 0;
  const tx = sqlite.transaction(() => {
    if (replaceAll) {
      // Clear all existing camper data (preserves logs, pins, etc.)
      const delResult = sqlite.prepare("DELETE FROM campers").run();
      deleted = delResult.changes;
    }
    for (const camper of parsed) {
      // Convert empty strings to null for clean storage
      const params: Record<string, string | null> = { createdAt: now, updatedAt: now };
      for (const [key, value] of Object.entries(camper)) {
        params[key] = (value as string) || null;
      }
      // These must always have values
      params.uniqueRegistrationId = camper.uniqueRegistrationId;
      params.firstName = camper.firstName;
      params.lastName = camper.lastName;
      params.campWeekend = camper.campWeekend;
      params.role = camper.role;

      const result = upsertStmt.run(params);
      if (result.changes === 1) inserted++;
      else updated++;
    }
  });

  tx();

  return NextResponse.json({
    success: true,
    inserted,
    updated,
    deleted,
    total: parsed.length,
  });
}
