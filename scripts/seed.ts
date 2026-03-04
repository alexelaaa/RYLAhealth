import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/db/schema";
import { parseRegistrationCsv } from "../src/lib/csv-parser";
import { hashSync } from "bcryptjs";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || "./data/ryla.db";
const resolvedDbPath = path.resolve(DB_PATH);

// Ensure data directory exists
const dataDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`Database path: ${resolvedDbPath}`);
const sqlite = new Database(resolvedDbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS campers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_registration_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date TEXT,
    gender TEXT,
    email TEXT,
    cell_phone TEXT,
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    school TEXT,
    grade_level TEXT,
    guardian_first_name TEXT,
    guardian_last_name TEXT,
    guardian_email TEXT,
    guardian_phone TEXT,
    emergency_first_name TEXT,
    emergency_last_name TEXT,
    emergency_relationship TEXT,
    emergency_phone TEXT,
    rotary_club_confirmed TEXT,
    sponsoring_rotary_club TEXT,
    sponsoring_club_code TEXT,
    camp_weekend TEXT NOT NULL,
    camp_date_flexibility TEXT,
    role TEXT NOT NULL,
    large_group TEXT,
    small_group TEXT,
    cabin_number TEXT,
    cabin_name TEXT,
    cabin_location TEXT,
    bus_number TEXT,
    bus_stop TEXT,
    bus_stop_location TEXT,
    bus_stop_address TEXT,
    pickup_time TEXT,
    dropoff_time TEXT,
    timed_medication_override INTEGER DEFAULT 0,
    medication_schedule TEXT,
    has_relative_attending TEXT,
    relative_first_name TEXT,
    relative_last_name TEXT,
    relative_role TEXT,
    dietary_restrictions TEXT,
    allergies TEXT,
    current_medications TEXT,
    medical_conditions TEXT,
    recent_injuries TEXT,
    physical_limitations TEXT,
    last_tetanus_shot TEXT,
    other_medical_needs TEXT,
    has_insurance TEXT,
    insurance_provider TEXT,
    policy_number TEXT,
    insured_first_name TEXT,
    insured_last_name TEXT,
    insurance_phone TEXT,
    first_aid_permission TEXT,
    otc_medication_permission TEXT,
    waiver_agreement TEXT,
    code_of_ethics TEXT,
    registration_time TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_campers_weekend ON campers(camp_weekend);
  CREATE INDEX IF NOT EXISTS idx_campers_last_name ON campers(last_name);
  CREATE INDEX IF NOT EXISTS idx_campers_role ON campers(role);
  CREATE INDEX IF NOT EXISTS idx_campers_unique_id ON campers(unique_registration_id);

  CREATE TABLE IF NOT EXISTS medical_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camper_id INTEGER NOT NULL REFERENCES campers(id),
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('medication_admin', 'first_aid', 'injury', 'illness', 'other')),
    medication TEXT,
    dosage TEXT,
    treatment TEXT,
    notes TEXT,
    logged_by TEXT NOT NULL,
    client_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS behavioral_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camper_id INTEGER NOT NULL REFERENCES campers(id),
    timestamp TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
    logged_by TEXT NOT NULL,
    client_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff_pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('nurse', 'staff', 'admin'))
  );

  CREATE TABLE IF NOT EXISTS camper_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camper_id INTEGER NOT NULL REFERENCES campers(id),
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT NOT NULL,
    changed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camper_id INTEGER NOT NULL UNIQUE REFERENCES campers(id),
    checked_in_at TEXT NOT NULL,
    checked_in_by TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS small_group_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_number INTEGER,
    small_group TEXT UNIQUE NOT NULL,
    large_group TEXT,
    meeting_location TEXT,
    dgl_first_name TEXT,
    dgl_last_name TEXT,
    dgl_cabin TEXT,
    dgl_gender TEXT,
    camper_count INTEGER,
    male_count INTEGER,
    female_count INTEGER,
    camp_weekend TEXT,
    created_at TEXT NOT NULL
  );
`);

console.log("Tables created.");

// Seed PINs
const NURSE_PIN = process.env.NURSE_PIN || "1234";
const STAFF_PIN = process.env.STAFF_PIN || "5678";
const ADMIN_PIN = process.env.ADMIN_PIN || "9012";

const BUS1_PIN = process.env.BUS1_PIN || "1111";
const BUS2_PIN = process.env.BUS2_PIN || "2222";

const pins = [
  { label: "Nurse", pin: NURSE_PIN, role: "nurse" as const },
  { label: "Staff", pin: STAFF_PIN, role: "staff" as const },
  { label: "Admin", pin: ADMIN_PIN, role: "admin" as const },
  { label: "Bus 1 Staff", pin: BUS1_PIN, role: "staff" as const },
  { label: "Bus 2 Staff", pin: BUS2_PIN, role: "staff" as const },
];

// Clear and re-insert PINs
sqlite.exec("DELETE FROM staff_pins");
for (const p of pins) {
  const hash = hashSync(p.pin, 10);
  db.insert(schema.staffPins)
    .values({ label: p.label, pinHash: hash, role: p.role })
    .run();
  console.log(`PIN set for ${p.label} (role: ${p.role})`);
}

// Import campers from CSV (preferred) or Excel (legacy)
const csvPath = path.resolve("campers.csv");
if (fs.existsSync(csvPath)) {
  console.log(`Parsing CSV file: ${csvPath}`);
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const camperData = parseRegistrationCsv(csvText);
  console.log(`Parsed ${camperData.length} camper records.`);

  let inserted = 0;
  let updated = 0;

  // --- Change tracking ---
  // Map camelCase param keys to snake_case DB columns
  const camelToSnake: Record<string, string> = {
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

  const lookupStmt = sqlite.prepare("SELECT * FROM campers WHERE unique_registration_id = ?");
  const changeLog: Array<{
    name: string;
    registrationId: string;
    action: "inserted" | "updated";
    changes: Array<{ field: string; oldValue: string; newValue: string }>;
  }> = [];

  // Insert statement for NEW campers only (no ON CONFLICT update)
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

  const now = new Date().toISOString();
  const upsertAll = sqlite.transaction(() => {
    for (const camper of camperData) {
      const params: Record<string, string | null> = { createdAt: now, updatedAt: now };
      for (const [key, value] of Object.entries(camper)) {
        params[key] = (value as string) || null;
      }
      params.uniqueRegistrationId = camper.uniqueRegistrationId;
      params.firstName = camper.firstName;
      params.lastName = camper.lastName;
      params.campWeekend = camper.campWeekend;
      params.role = camper.role;

      // Check for existing record
      const existing = lookupStmt.get(camper.uniqueRegistrationId) as Record<string, unknown> | undefined;

      if (!existing) {
        // New camper — insert all fields
        insertStmt.run(params);
        inserted++;
        changeLog.push({
          name: `${camper.firstName} ${camper.lastName}`,
          registrationId: camper.uniqueRegistrationId,
          action: "inserted",
          changes: [],
        });
      } else {
        // Existing camper — only update fields where the new CSV has a non-empty value
        const setClauses: string[] = [];
        const values: (string | null)[] = [];
        const camperChanges: Array<{ field: string; oldValue: string; newValue: string }> = [];

        for (const [camelKey, snakeKey] of Object.entries(camelToSnake)) {
          const newVal = String(params[camelKey] ?? "");
          if (!newVal) continue; // Skip empty — don't overwrite existing data with blanks

          const oldVal = String(existing[snakeKey] ?? "");
          if (oldVal !== newVal) {
            setClauses.push(`${snakeKey} = ?`);
            values.push(newVal);
            camperChanges.push({ field: snakeKey, oldValue: oldVal, newValue: newVal });
          }
        }

        if (camperChanges.length > 0) {
          setClauses.push("updated_at = ?");
          values.push(now);
          values.push(String(existing.id));
          sqlite.prepare(
            `UPDATE campers SET ${setClauses.join(", ")} WHERE id = ?`
          ).run(...values);

          updated++;
          changeLog.push({
            name: `${camper.firstName} ${camper.lastName}`,
            registrationId: camper.uniqueRegistrationId,
            action: "updated",
            changes: camperChanges,
          });
        }
      }
    }
  });

  upsertAll();

  // --- Write change report ---
  const reportDir = path.resolve("data");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const timestamp = now.replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = path.resolve(reportDir, `import-report-${timestamp}.csv`);

  const reportLines = ["Camper Name,Registration ID,Action,Field Changed,Old Value,New Value"];
  for (const entry of changeLog) {
    if (entry.action === "inserted") {
      reportLines.push(`"${entry.name}","${entry.registrationId}",inserted,,,`);
    } else {
      for (const c of entry.changes) {
        const oldVal = c.oldValue.replace(/"/g, '""');
        const newVal = c.newValue.replace(/"/g, '""');
        reportLines.push(
          `"${entry.name}","${entry.registrationId}",updated,"${c.field}","${oldVal}","${newVal}"`
        );
      }
    }
  }
  fs.writeFileSync(reportPath, reportLines.join("\n"), "utf-8");

  // Console summary
  const unchangedCount = camperData.length - inserted - updated;
  console.log(`\nImport complete: ${inserted} inserted, ${updated} updated, ${unchangedCount} unchanged.`);
  if (changeLog.length > 0) {
    console.log(`\nChange report saved to: ${reportPath}`);
    console.log(`\n--- Changes Summary ---`);
    for (const entry of changeLog) {
      if (entry.action === "inserted") {
        console.log(`  + NEW: ${entry.name}`);
      } else {
        console.log(`  ~ UPDATED: ${entry.name}`);
        for (const c of entry.changes) {
          console.log(`      ${c.field}: "${c.oldValue}" → "${c.newValue}"`);
        }
      }
    }
  } else {
    console.log("No changes detected.");
  }
} else {
  console.log(`CSV file not found at ${csvPath}, skipping camper import.`);
}

console.log("Seed complete!");
sqlite.close();
