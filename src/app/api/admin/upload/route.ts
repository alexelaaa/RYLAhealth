import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { db, sqlite } from "@/db";
import { campers } from "@/db/schema";
// drizzle-orm eq unused - upsert handled by raw SQL
import { parseRegistrationExcel } from "@/lib/excel-parser";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const confirm = formData.get("confirm") === "true";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseRegistrationExcel(buffer);

  if (!confirm) {
    // Preview mode: show what will change
    const existing = db.select({ uniqueRegistrationId: campers.uniqueRegistrationId }).from(campers).all();
    const existingIds = new Set(existing.map((c) => c.uniqueRegistrationId));

    const newRecords = parsed.filter((c) => !existingIds.has(c.uniqueRegistrationId));
    const updateRecords = parsed.filter((c) => existingIds.has(c.uniqueRegistrationId));

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
      school, grade_level, guardian_first_name, guardian_last_name, guardian_email,
      guardian_phone, emergency_first_name, emergency_last_name, emergency_relationship,
      emergency_phone, rotary_club_confirmed, sponsoring_rotary_club, sponsoring_club_code,
      camp_weekend, camp_date_flexibility, role, has_relative_attending,
      relative_first_name, relative_last_name, relative_role,
      dietary_restrictions, allergies, current_medications, medical_conditions,
      recent_injuries, physical_limitations, last_tetanus_shot, other_medical_needs,
      has_insurance, insurance_provider, policy_number, insured_first_name,
      insured_last_name, insurance_phone, first_aid_permission, otc_medication_permission,
      waiver_agreement, code_of_ethics, registration_time, created_at, updated_at
    ) VALUES (
      @uniqueRegistrationId, @firstName, @lastName, @birthDate, @gender, @email,
      @cellPhone, @addressStreet, @addressCity, @addressState, @addressZip,
      @school, @gradeLevel, @guardianFirstName, @guardianLastName, @guardianEmail,
      @guardianPhone, @emergencyFirstName, @emergencyLastName, @emergencyRelationship,
      @emergencyPhone, @rotaryClubConfirmed, @sponsoringRotaryClub, @sponsoringClubCode,
      @campWeekend, @campDateFlexibility, @role, @hasRelativeAttending,
      @relativeFirstName, @relativeLastName, @relativeRole,
      @dietaryRestrictions, @allergies, @currentMedications, @medicalConditions,
      @recentInjuries, @physicalLimitations, @lastTetanusShot, @otherMedicalNeeds,
      @hasInsurance, @insuranceProvider, @policyNumber, @insuredFirstName,
      @insuredLastName, @insurancePhone, @firstAidPermission, @otcMedicationPermission,
      @waiverAgreement, @codeOfEthics, @registrationTime, @createdAt, @updatedAt
    ) ON CONFLICT(unique_registration_id) DO UPDATE SET
      first_name=excluded.first_name, last_name=excluded.last_name,
      birth_date=excluded.birth_date, gender=excluded.gender, email=excluded.email,
      cell_phone=excluded.cell_phone, school=excluded.school,
      camp_weekend=excluded.camp_weekend, role=excluded.role,
      allergies=excluded.allergies, current_medications=excluded.current_medications,
      medical_conditions=excluded.medical_conditions, updated_at=excluded.updated_at
  `);

  const now = new Date().toISOString();
  const tx = sqlite.transaction(() => {
    for (const camper of parsed) {
      const result = upsertStmt.run({
        ...camper,
        createdAt: now,
        updatedAt: now,
      });
      if (result.changes === 1) inserted++;
      else updated++;
    }
  });

  tx();

  return NextResponse.json({
    success: true,
    inserted,
    updated,
    total: parsed.length,
  });
}
