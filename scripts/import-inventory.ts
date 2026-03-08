import Database from "better-sqlite3";
import { readFileSync } from "fs";

const DB_PATH = process.env.DATABASE_PATH || "./data/ryla.db";
const CSV_PATH = process.argv[2];

if (!CSV_PATH) {
  console.error("Usage: npx tsx scripts/import-inventory.ts <path-to-csv>");
  process.exit(1);
}

// Simple CSV parser that handles quoted fields with commas
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

const raw = readFileSync(CSV_PATH, "utf-8");
const records = parseCSV(raw);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const insert = db.prepare(`
  INSERT INTO inventory_items (item_name, category, quantity, size, unit, notes, entered_by, camp_weekend, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();
const campWeekend = "May 15th-17th";
let count = 0;

for (const row of records) {
  const brand = row["Brand"] || "";
  const medication = row["Medication"] || "";
  const strength = row["Strength / Contents"] || "";
  const lotNumber = row["Lot Number"] || "";
  const expDate = row["Expiration Date"] || "";
  const qtyRaw = row["Quantity"] || "1";
  const totalVolume = row["Total Volume / Amount"] || "";

  // Parse quantity number and unit from "1 bottle", "2 bottles", etc.
  const qtyMatch = qtyRaw.match(/^(\d+)\s*(.*)$/);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
  const unit = qtyMatch ? qtyMatch[2].trim() : qtyRaw;

  const itemName = `${brand} ${medication}`.trim();

  // Build notes from the detailed fields
  const notesParts: string[] = [];
  if (strength) notesParts.push(`Strength: ${strength}`);
  if (totalVolume) notesParts.push(`Total: ${totalVolume}`);
  if (lotNumber) notesParts.push(`Lot: ${lotNumber}`);
  if (expDate) notesParts.push(`Exp: ${expDate}`);
  const notes = notesParts.join(" | ");

  insert.run(itemName, "Medical", quantity, null, unit, notes, "CSV Import", campWeekend, now, now);
  count++;
  console.log(`  + ${itemName} (${quantity} ${unit})`);
}

console.log(`\nImported ${count} medical inventory items for ${campWeekend}`);
db.close();
