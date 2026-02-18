import Database from "better-sqlite3";
import { hashSync } from "bcryptjs";
import path from "path";

const dbPath = process.env.DATABASE_PATH || "./data/ryla.db";
const resolvedPath = path.resolve(dbPath);
const sqlite = new Database(resolvedPath);

const busPins = [
  { label: "Bus 1 Staff", pin: "1111", role: "staff" },
  { label: "Bus 2 Staff", pin: "2222", role: "staff" },
];

for (const p of busPins) {
  const existing = sqlite
    .prepare("SELECT id FROM staff_pins WHERE label = ?")
    .get(p.label);
  if (existing) {
    console.log(`${p.label} already exists, skipping.`);
    continue;
  }
  const hash = hashSync(p.pin, 10);
  sqlite
    .prepare("INSERT INTO staff_pins (label, pin_hash, role) VALUES (?, ?, ?)")
    .run(p.label, hash, p.role);
  console.log(`Added ${p.label} with PIN ${p.pin}`);
}

sqlite.close();
console.log("Done.");
