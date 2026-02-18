import Database from "better-sqlite3";
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

const sqlite = new Database(resolvedDbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Ensure staff_pins table exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS staff_pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('nurse', 'staff', 'admin'))
  )
`);

// Only seed if table is empty
const count = sqlite.prepare("SELECT COUNT(*) as cnt FROM staff_pins").get() as { cnt: number };
if (count.cnt === 0) {
  console.log("No PINs found, seeding...");

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

  const stmt = sqlite.prepare(
    "INSERT OR IGNORE INTO staff_pins (label, pin_hash, role) VALUES (?, ?, ?)"
  );
  for (const p of pins) {
    stmt.run(p.label, hashSync(p.pin, 10), p.role);
    console.log(`PIN set for ${p.label}`);
  }
} else {
  console.log(`PINs already exist (${count.cnt} entries), skipping.`);
}

sqlite.close();
console.log("Done.");
