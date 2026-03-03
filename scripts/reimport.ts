import Database from "better-sqlite3";
import Papa from "papaparse";
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

// Delete existing database to start fresh
if (fs.existsSync(resolvedDbPath)) {
  fs.unlinkSync(resolvedDbPath);
  console.log(`Deleted existing database at ${resolvedDbPath}`);
}

console.log(`Creating fresh database at ${resolvedDbPath}`);
const sqlite = new Database(resolvedDbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create all tables
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

  CREATE TABLE IF NOT EXISTS bus_waypoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id TEXT NOT NULL,
    bus_label TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    heading REAL,
    speed REAL,
    tracked_by TEXT NOT NULL,
    camp_weekend TEXT,
    client_id TEXT,
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_waypoints_bus_id ON bus_waypoints(bus_id);
  CREATE INDEX IF NOT EXISTS idx_waypoints_camp_weekend ON bus_waypoints(camp_weekend);
  CREATE INDEX IF NOT EXISTS idx_waypoints_client_id ON bus_waypoints(client_id);
  CREATE INDEX IF NOT EXISTS idx_waypoints_timestamp ON bus_waypoints(timestamp);

  CREATE TABLE IF NOT EXISTS camp_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    staff_type TEXT NOT NULL,
    staff_role TEXT,
    phone TEXT,
    email TEXT,
    camp_weekend TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_camp_staff_type ON camp_staff(staff_type);
  CREATE INDEX IF NOT EXISTS idx_camp_staff_weekend ON camp_staff(camp_weekend);

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

console.log("All tables created.");

// --- Seed PINs ---
const NURSE_PIN = process.env.NURSE_PIN || "1234";
const STAFF_PIN = process.env.STAFF_PIN || "5678";
const ADMIN_PIN = process.env.ADMIN_PIN || "9012";
const BUS1_PIN = process.env.BUS1_PIN || "1111";
const BUS2_PIN = process.env.BUS2_PIN || "2222";

const pins = [
  { label: "Nurse", pin: NURSE_PIN, role: "nurse" },
  { label: "Staff", pin: STAFF_PIN, role: "staff" },
  { label: "Admin", pin: ADMIN_PIN, role: "admin" },
  { label: "Bus 1 Staff", pin: BUS1_PIN, role: "staff" },
  { label: "Bus 2 Staff", pin: BUS2_PIN, role: "staff" },
];

const insertPin = sqlite.prepare(
  `INSERT INTO staff_pins (label, pin_hash, role) VALUES (?, ?, ?)`
);
for (const p of pins) {
  const hash = hashSync(p.pin, 10);
  insertPin.run(p.label, hash, p.role);
  console.log(`PIN set for ${p.label} (role: ${p.role})`);
}

// --- Helper ---
function str(val: string | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function findByPrefix(row: Record<string, string | undefined>, prefix: string): string | undefined {
  const key = Object.keys(row).find((k) => k.startsWith(prefix));
  return key ? row[key] : undefined;
}

function deriveBusNumber(busStop: string): string {
  if (!busStop) return "";
  const match = busStop.trim().match(/^(\d+)[A-Za-z]?$/);
  return match ? match[1] : busStop.trim();
}

// --- Import March Campers CSV ---
const campersCsvPath = path.resolve(
  process.argv[2] || "/Users/alex/Downloads/RYLA 2026.xlsx - March Campers.csv"
);
if (!fs.existsSync(campersCsvPath)) {
  console.error(`Campers CSV not found at ${campersCsvPath}`);
  process.exit(1);
}

console.log(`\nParsing campers CSV: ${campersCsvPath}`);
const csvText = fs.readFileSync(campersCsvPath, "utf-8");
const parsed = Papa.parse<Record<string, string | undefined>>(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h: string) => h.trim(),
});

const insertCamper = sqlite.prepare(`
  INSERT INTO campers (
    unique_registration_id, first_name, last_name, birth_date, gender, email,
    cell_phone, address_city,
    school, grade_level, guardian_first_name, guardian_last_name, guardian_email,
    guardian_phone, sponsoring_rotary_club,
    camp_weekend, role, has_relative_attending,
    relative_first_name, relative_last_name, relative_role,
    dietary_restrictions, allergies, current_medications, medical_conditions,
    large_group, small_group, cabin_name, cabin_location,
    bus_stop, bus_stop_location, bus_stop_address, pickup_time, dropoff_time,
    bus_number, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?,
    ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?
  )
`);

const now = new Date().toISOString();
let inserted = 0;

const importCampers = sqlite.transaction(() => {
  for (const row of parsed.data) {
    const firstName = str(row["First"]);
    const lastName = str(row["Last"]);
    if (!firstName || !lastName) continue;

    const busStop = str(row["Bus Stop"]);
    const uniqueId = `${firstName}-${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

    insertCamper.run(
      uniqueId || `unknown-${Date.now()}`,
      firstName,
      lastName,
      str(row["DOB"]) || null,
      str(row["Gender"]) || null,
      str(row["Participant Email"]) || null,
      str(row["Participant Cell"]) || null,
      str(row["Participant City"]) || null,
      str(row["High School"]) || null,
      str(row["Participant Grade Level"]) || null,
      str(row["Guardian Name (First)"]) || null,
      str(row["Guardian Name (Last)"]) || null,
      str(row["Guardian Email"]) || null,
      str(row["Guardian Phone"]) || null,
      str(row["Sponsoring Rotary Club"]) || null,
      str(row["Camp"]) || "March",
      str(row["Role"]) || "Camper",
      str(row["Relative attending camp?"]) || null,
      str(row["Relative Name (First)"]) || null,
      str(row["Relative Name (Last)"]) || null,
      str(row["Relative Role"]) || null,
      str(row["Dietary Restrictions"]) || null,
      str(findByPrefix(row, "Allergies")) || null,
      str(findByPrefix(row, "Current Medications")) || null,
      str(findByPrefix(row, "Medical Conditions")) || null,
      str(row["Large Group"]) || null,
      str(row["Small Group"]) || null,
      str(row["Cabin Name"]) || null,
      str(row["Cabin Location"]) || null,
      busStop || null,
      str(row["Location"]) || null,
      str(row["Address"]) || null,
      str(row["Pickup Time"]) || null,
      str(row["Drop Off Time"]) || null,
      deriveBusNumber(busStop) || null,
      now,
      now,
    );
    inserted++;
  }
});

importCampers();
console.log(`Imported ${inserted} campers.`);

// --- Import Group Info CSV ---
const groupInfoCsvPath = path.resolve(
  process.argv[3] || "/Users/alex/Downloads/RYLA 2026.xlsx - Group Info.csv"
);
if (fs.existsSync(groupInfoCsvPath)) {
  console.log(`\nParsing group info CSV: ${groupInfoCsvPath}`);
  const groupCsvText = fs.readFileSync(groupInfoCsvPath, "utf-8");
  const groupParsed = Papa.parse<Record<string, string | undefined>>(groupCsvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const insertGroup = sqlite.prepare(`
    INSERT OR IGNORE INTO small_group_info (
      group_number, small_group, large_group, meeting_location,
      dgl_first_name, dgl_last_name, dgl_cabin, dgl_gender,
      camper_count, male_count, female_count, camp_weekend, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let groupsInserted = 0;
  const importGroups = sqlite.transaction(() => {
    for (const row of groupParsed.data) {
      const smallGroup = str(row["Small Group"]);
      if (!smallGroup) continue;

      // First column is unnamed - it's the group number
      const groupNumber = parseInt(str(row[""] || row[Object.keys(row)[0]])) || null;

      insertGroup.run(
        groupNumber,
        smallGroup,
        str(row["Large Group"]) || null,
        str(row["Meeting Location"]) || null,
        str(row["First"]) || null,
        str(row["Last"]) || null,
        str(row["DGL Sleeping"]) || null,
        str(row["DGL Gender"]) || null,
        parseInt(str(row["Count"])) || null,
        parseInt(str(row["Male"])) || null,
        parseInt(str(row["Female"])) || null,
        "March 6th-8th",
        now,
      );
      groupsInserted++;
    }
  });

  importGroups();
  console.log(`Imported ${groupsInserted} small group info records.`);
} else {
  console.log(`Group info CSV not found at ${groupInfoCsvPath}, skipping.`);
}

// --- Summary ---
const camperCount = (sqlite.prepare("SELECT COUNT(*) as cnt FROM campers").get() as { cnt: number }).cnt;
const groupCount = (sqlite.prepare("SELECT COUNT(*) as cnt FROM small_group_info").get() as { cnt: number }).cnt;
console.log(`\nDatabase ready:`);
console.log(`  Campers: ${camperCount}`);
console.log(`  Small Group Info: ${groupCount}`);
console.log(`  Staff PINs: ${pins.length}`);

sqlite.close();
console.log("Done!");
