import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/db/schema";
import { parseRegistrationExcel } from "../src/lib/excel-parser";
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
    bus_number TEXT,
    timed_medication_override INTEGER DEFAULT 0,
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

// Import campers from Excel
const excelPath = path.resolve(
  "RYLACamperRegistration_Data_16811801_1771385287.xlsx"
);
if (!fs.existsSync(excelPath)) {
  console.log(`Excel file not found at ${excelPath}, skipping camper import.`);
  process.exit(0);
}

console.log(`Parsing Excel file: ${excelPath}`);
const buffer = fs.readFileSync(excelPath);
const camperData = parseRegistrationExcel(buffer);
console.log(`Parsed ${camperData.length} camper records.`);

// Upsert campers
let inserted = 0;
let updated = 0;

const insertStmt = sqlite.prepare(`
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
    cell_phone=excluded.cell_phone, address_street=excluded.address_street,
    address_city=excluded.address_city, address_state=excluded.address_state,
    address_zip=excluded.address_zip, school=excluded.school,
    grade_level=excluded.grade_level, guardian_first_name=excluded.guardian_first_name,
    guardian_last_name=excluded.guardian_last_name, guardian_email=excluded.guardian_email,
    guardian_phone=excluded.guardian_phone, emergency_first_name=excluded.emergency_first_name,
    emergency_last_name=excluded.emergency_last_name, emergency_relationship=excluded.emergency_relationship,
    emergency_phone=excluded.emergency_phone, rotary_club_confirmed=excluded.rotary_club_confirmed,
    sponsoring_rotary_club=excluded.sponsoring_rotary_club, sponsoring_club_code=excluded.sponsoring_club_code,
    camp_weekend=excluded.camp_weekend, camp_date_flexibility=excluded.camp_date_flexibility,
    role=excluded.role, has_relative_attending=excluded.has_relative_attending,
    relative_first_name=excluded.relative_first_name, relative_last_name=excluded.relative_last_name,
    relative_role=excluded.relative_role, dietary_restrictions=excluded.dietary_restrictions,
    allergies=excluded.allergies, current_medications=excluded.current_medications,
    medical_conditions=excluded.medical_conditions, recent_injuries=excluded.recent_injuries,
    physical_limitations=excluded.physical_limitations, last_tetanus_shot=excluded.last_tetanus_shot,
    other_medical_needs=excluded.other_medical_needs, has_insurance=excluded.has_insurance,
    insurance_provider=excluded.insurance_provider, policy_number=excluded.policy_number,
    insured_first_name=excluded.insured_first_name, insured_last_name=excluded.insured_last_name,
    insurance_phone=excluded.insurance_phone, first_aid_permission=excluded.first_aid_permission,
    otc_medication_permission=excluded.otc_medication_permission, waiver_agreement=excluded.waiver_agreement,
    code_of_ethics=excluded.code_of_ethics, registration_time=excluded.registration_time,
    updated_at=excluded.updated_at
`);

const now = new Date().toISOString();
const upsertAll = sqlite.transaction(() => {
  for (const camper of camperData) {
    const result = insertStmt.run({
      ...camper,
      createdAt: now,
      updatedAt: now,
    });
    if (result.changes === 1) {
      inserted++;
    } else {
      updated++;
    }
  }
});

upsertAll();
console.log(`Import complete: ${inserted} inserted, ${updated} updated.`);
console.log("Seed complete!");

sqlite.close();
