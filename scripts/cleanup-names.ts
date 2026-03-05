/**
 * Proper-case all camper first/last names.
 *
 * Usage:
 *   npx tsx scripts/cleanup-names.ts          # dry run (prints changes)
 *   npx tsx scripts/cleanup-names.ts --apply   # apply changes to database
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || "./data/ryla.db";
const resolvedDbPath = path.resolve(DB_PATH);
const apply = process.argv.includes("--apply");

const sqlite = new Database(resolvedDbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

/**
 * Proper-case a name: title case with hyphen/apostrophe handling.
 * Preserves common prefixes like Mc, Mac, O', De, La, etc.
 */
function properCaseName(name: string): string {
  if (!name) return name;

  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(/(\s+|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      if (!part) return part;

      // Handle apostrophes (e.g., O'Brien, D'Angelo)
      const apostropheMatch = part.match(/^([A-Za-z])'(.+)$/);
      if (apostropheMatch) {
        return (
          apostropheMatch[1].toUpperCase() +
          "'" +
          apostropheMatch[2].charAt(0).toUpperCase() +
          apostropheMatch[2].slice(1).toLowerCase()
        );
      }

      // Handle Mc prefix (e.g., McDonald, McBride)
      const mcMatch = part.match(/^(mc)(.+)$/i);
      if (mcMatch) {
        return (
          "Mc" +
          mcMatch[2].charAt(0).toUpperCase() +
          mcMatch[2].slice(1).toLowerCase()
        );
      }

      // Handle Mac prefix (e.g., MacDonald) — only if 5+ chars to avoid "Mack" etc.
      const macMatch = part.match(/^(mac)(.{3,})$/i);
      if (macMatch) {
        return (
          "Mac" +
          macMatch[2].charAt(0).toUpperCase() +
          macMatch[2].slice(1).toLowerCase()
        );
      }

      // Standard title case
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

interface CamperRow {
  id: number;
  first_name: string;
  last_name: string;
}

const campers = sqlite
  .prepare("SELECT id, first_name, last_name FROM campers")
  .all() as CamperRow[];

interface Change {
  id: number;
  field: "first_name" | "last_name";
  oldValue: string;
  newValue: string;
}

const changes: Change[] = [];

for (const camper of campers) {
  const newFirst = properCaseName(camper.first_name);
  const newLast = properCaseName(camper.last_name);

  if (newFirst !== camper.first_name) {
    changes.push({ id: camper.id, field: "first_name", oldValue: camper.first_name, newValue: newFirst });
  }
  if (newLast !== camper.last_name) {
    changes.push({ id: camper.id, field: "last_name", oldValue: camper.last_name, newValue: newLast });
  }
}

console.log(`Found ${changes.length} name changes across ${campers.length} campers`);

if (changes.length === 0) {
  console.log("No changes needed.");
  process.exit(0);
}

// Print sample changes
const sample = changes.slice(0, 30);
for (const c of sample) {
  console.log(`  [${c.id}] ${c.field}: "${c.oldValue}" -> "${c.newValue}"`);
}
if (changes.length > 30) {
  console.log(`  ... and ${changes.length - 30} more`);
}

if (!apply) {
  console.log("\nDry run complete. Run with --apply to save changes.");
  process.exit(0);
}

// Apply changes
console.log("\nApplying changes...");

const now = new Date().toISOString();

const updateFirst = sqlite.prepare("UPDATE campers SET first_name = ?, updated_at = ? WHERE id = ?");
const updateLast = sqlite.prepare("UPDATE campers SET last_name = ?, updated_at = ? WHERE id = ?");
const auditStmt = sqlite.prepare(
  "INSERT INTO camper_edits (camper_id, field_name, old_value, new_value, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?)"
);

const transaction = sqlite.transaction(() => {
  for (const c of changes) {
    if (c.field === "first_name") {
      updateFirst.run(c.newValue, now, c.id);
    } else {
      updateLast.run(c.newValue, now, c.id);
    }
    auditStmt.run(c.id, c.field, c.oldValue, c.newValue, "cleanup-script", now);
  }
});

transaction();
console.log(`Applied ${changes.length} changes with audit trail.`);
