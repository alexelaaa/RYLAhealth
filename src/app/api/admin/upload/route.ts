import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { db, sqlite } from "@/db";
import { campers, camperEdits } from "@/db/schema";
import { parseRegistrationCsv } from "@/lib/csv-parser";

// Map camelCase param keys to snake_case DB columns
const CAMEL_TO_SNAKE: Record<string, string> = {
  uniqueRegistrationId: "unique_registration_id",
  firstName: "first_name", lastName: "last_name", birthDate: "birth_date",
  gender: "gender", email: "email", cellPhone: "cell_phone",
  addressStreet: "address_street", addressCity: "address_city",
  addressState: "address_state", addressZip: "address_zip",
  school: "school", gradeLevel: "grade_level",
  guardianFirstName: "guardian_first_name", guardianLastName: "guardian_last_name",
  guardianEmail: "guardian_email", guardianPhone: "guardian_phone",
  emergencyFirstName: "emergency_first_name", emergencyLastName: "emergency_last_name",
  emergencyRelationship: "emergency_relationship", emergencyPhone: "emergency_phone",
  sponsoringRotaryClub: "sponsoring_rotary_club",
  campWeekend: "camp_weekend", role: "role",
  hasRelativeAttending: "has_relative_attending",
  relativeFirstName: "relative_first_name", relativeLastName: "relative_last_name",
  relativeRole: "relative_role",
  dietaryRestrictions: "dietary_restrictions", allergies: "allergies",
  currentMedications: "current_medications", medicalConditions: "medical_conditions",
  recentInjuries: "recent_injuries", physicalLimitations: "physical_limitations",
  lastTetanusShot: "last_tetanus_shot", otherMedicalNeeds: "other_medical_needs",
  hasInsurance: "has_insurance", insuranceProvider: "insurance_provider",
  policyNumber: "policy_number",
  insuredFirstName: "insured_first_name", insuredLastName: "insured_last_name",
  insurancePhone: "insurance_phone",
  firstAidPermission: "first_aid_permission", otcMedicationPermission: "otc_medication_permission",
  largeGroup: "large_group", smallGroup: "small_group",
  cabinName: "cabin_name", cabinLocation: "cabin_location",
  busStop: "bus_stop", busStopLocation: "bus_stop_location",
  busStopAddress: "bus_stop_address", pickupTime: "pickup_time",
  dropoffTime: "dropoff_time", busNumber: "bus_number",
};

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

  // Actual import
  let inserted = 0;
  let updated = 0;
  const changes: Array<{ name: string; field: string; oldValue: string; newValue: string }> = [];

  // Insert statement for NEW campers only
  const insertStmt = sqlite.prepare(`
    INSERT OR IGNORE INTO campers (
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
    )
  `);

  const lookupStmt = sqlite.prepare("SELECT * FROM campers WHERE unique_registration_id = ?");

  const now = new Date().toISOString();
  let deleted = 0;

  try {
    const tx = sqlite.transaction(() => {
      if (replaceAll) {
        const delResult = sqlite.prepare("DELETE FROM campers").run();
        deleted = delResult.changes;
      }
      for (const camper of parsed) {
        const params: Record<string, string | null> = { createdAt: now, updatedAt: now };
        for (const [key, value] of Object.entries(camper)) {
          params[key] = (value as string) || null;
        }
        params.uniqueRegistrationId = camper.uniqueRegistrationId;
        params.firstName = camper.firstName;
        params.lastName = camper.lastName;
        params.campWeekend = camper.campWeekend;
        params.role = camper.role;

        const existing = lookupStmt.get(camper.uniqueRegistrationId) as Record<string, unknown> | undefined;

        if (!existing || replaceAll) {
          // New camper or replace-all mode — insert all fields
          insertStmt.run(params);
          inserted++;
        } else {
          // Existing camper — only update fields where the new CSV has a non-empty value
          const setClauses: string[] = [];
          const values: (string | null)[] = [];

          for (const [camelKey, snakeKey] of Object.entries(CAMEL_TO_SNAKE)) {
            const newVal = String(params[camelKey] ?? "");
            if (!newVal) continue; // Skip empty — don't overwrite existing data with blanks

            const oldVal = String(existing[snakeKey] ?? "");
            if (oldVal !== newVal) {
              setClauses.push(`${snakeKey} = ?`);
              values.push(newVal);
              changes.push({
                name: `${camper.firstName} ${camper.lastName}`,
                field: snakeKey,
                oldValue: oldVal,
                newValue: newVal,
              });

              // Write to camper_edits audit trail
              db.insert(camperEdits).values({
                camperId: existing.id as number,
                fieldName: camelKey,
                oldValue: oldVal || null,
                newValue: newVal || null,
                changedBy: "CSV Import",
                changedAt: now,
              }).run();
            }
          }

          if (setClauses.length > 0) {
            setClauses.push("updated_at = ?");
            values.push(now);
            values.push(String(existing.id));
            sqlite.prepare(
              `UPDATE campers SET ${setClauses.join(", ")} WHERE id = ?`
            ).run(...values);
            updated++;
          }
        }
      }
    });

    tx();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Import error:", message);
    return NextResponse.json({ error: `Import failed: ${message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    inserted,
    updated,
    deleted,
    total: parsed.length,
    changes,
  });
}
