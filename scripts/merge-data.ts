import * as XLSX from "xlsx";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

const excelPath = path.resolve("/Users/alex/Downloads/RYLACamperRegistration_Data_16811801_1771385287.xlsx");
const csvPath = path.resolve("/Users/alex/Downloads/RYLA 2026.xlsx - March Campers.csv");
const outputPath = path.resolve("/Users/alex/Desktop/RYLAhealth/merged-campers.csv");

function str(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function findByPrefix(row: Record<string, unknown>, prefix: string): string {
  const key = Object.keys(row).find((k) => k.startsWith(prefix));
  return key ? str(row[key] as string) : "";
}

function parseExcelDate(val: string | number | undefined): string {
  if (!val) return "";
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.m}/${date.d}/${date.y}`;
  }
  return String(val).trim();
}

// --- Read Excel registration data ---
console.log("Reading Excel registration file...");
const wb = XLSX.read(fs.readFileSync(excelPath), { type: "buffer" });
const ws = wb.Sheets[wb.SheetNames[0]];
const excelRows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
console.log(`  ${excelRows.length} registration records`);

// Index Excel rows by lowercase "first|last"
const excelMap = new Map<string, Record<string, unknown>>();
for (const row of excelRows) {
  const key = `${str(row["Participant Name (First)"])}|${str(row["Participant Name (Last)"])}`.toLowerCase();
  excelMap.set(key, row);
}

// --- Read CSV assignment data ---
console.log("Reading CSV assignment file...");
const csvText = fs.readFileSync(csvPath, "utf-8");
const csvRows = Papa.parse<Record<string, string>>(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h: string) => h.trim(),
}).data;
console.log(`  ${csvRows.length} assignment records`);

// --- Merge ---
console.log("Merging...");
const merged: Record<string, string>[] = [];
let matchCount = 0;
let noMatchCount = 0;

for (const csv of csvRows) {
  const firstName = str(csv["First"]);
  const lastName = str(csv["Last"]);
  if (!firstName || !lastName) continue;

  const key = `${firstName}|${lastName}`.toLowerCase();
  const excel = excelMap.get(key);

  if (excel) matchCount++;
  else noMatchCount++;

  merged.push({
    // Identity
    "First": firstName,
    "Last": lastName,
    "DOB": str(csv["DOB"]) || (excel ? parseExcelDate(excel["Participant Name Birth Date"] as string | number) : ""),
    "Gender": str(csv["Gender"]) || (excel ? str(excel["Participant Gender"] as string) : ""),
    "Participant Email": str(csv["Participant Email"]) || (excel ? str(excel["Participant Email"] as string) : ""),
    "Participant Cell": str(csv["Participant Cell"]) || (excel ? str(excel["Participant Cell Phone Number"] as string) : ""),

    // Address (from Excel - CSV only has city)
    "Address Street": excel ? str(excel["Participant Home Address (Address)"] as string) : "",
    "Participant City": str(csv["Participant City"]) || (excel ? str(excel["Participant Home Address (City)"] as string) : ""),
    "Address State": excel ? str(excel["Participant Home Address (State)"] as string) : "",
    "Address Zip": excel ? str(excel["Participant Home Address (Zip)"] as string) : "",

    // School
    "High School": str(csv["High School"]) || (excel ? str(excel["Name of Participant's School"] as string) : ""),
    "Participant Grade Level": str(csv["Participant Grade Level"]) || (excel ? str(excel["Participant Grade Level"] as string) : ""),

    // Guardian
    "Guardian Name (First)": str(csv["Guardian Name (First)"]) || (excel ? str(excel["Guardian Name (First)"] as string) : ""),
    "Guardian Name (Last)": str(csv["Guardian Name (Last)"]) || (excel ? str(excel["Guardian Name (Last)"] as string) : ""),
    "Guardian Email": str(csv["Guardian Email"]) || (excel ? str(excel["Guardian Email"] as string) : ""),
    "Guardian Phone": str(csv["Guardian Phone"]) || (excel ? str(excel["Guardian Phone"] as string) : ""),

    // Emergency Contact (Excel only)
    "Emergency Contact (First)": excel ? str(excel["Emergency Contact Name (First)"] as string) : "",
    "Emergency Contact (Last)": excel ? str(excel["Emergency Contact Name (Last)"] as string) : "",
    "Emergency Contact Relationship": excel ? str(excel["Emergency Contact Relationship to Participant"] as string) : "",
    "Emergency Contact Phone": excel ? str(excel["Emergency Contact Phone"] as string) : "",

    // Rotary
    "Sponsoring Rotary Club": str(csv["Sponsoring Rotary Club"]) || (excel ? str(excel["Sponsoring Rotary Club"] as string) : ""),

    // Camp assignment (from CSV)
    "Cabin Location": str(csv["Cabin Location"]),
    "Cabin Name": str(csv["Cabin Name"]),
    "Small Group": str(csv["Small Group"]),
    "Large Group": str(csv["Large Group"]),
    "Bus Stop": str(csv["Bus Stop"]),
    "Bus Stop Location": str(csv["Location"]),
    "Bus Stop Address": str(csv["Address"]),
    "Pickup Time": str(csv["Pickup Time"]),
    "Drop Off Time": str(csv["Drop Off Time"]),

    // Camp info
    "Camp": str(csv["Camp"]) || (excel ? findByPrefix(excel, "Please select which RYLA weekend") : ""),
    "Role": str(csv["Role"]) || (excel ? str(excel["Role of Participant"] as string) : "") || "Camper",

    // Relative
    "Relative attending camp?": str(csv["Relative attending camp?"]) || (excel ? findByPrefix(excel, "Does the participant have a relative") : ""),
    "Relative Name (First)": str(csv["Relative Name (First)"]) || (excel ? str(excel["Relative Name (First)"] as string) : ""),
    "Relative Name (Last)": str(csv["Relative Name (Last)"]) || (excel ? str(excel["Relative Name (Last)"] as string) : ""),
    "Relative Role": str(csv["Relative Role"]) || (excel ? str(excel["Relative Role"] as string) : ""),

    // Medical (prefer CSV, fall back to Excel)
    "Dietary Restrictions": str(csv["Dietary Restrictions"]) || (excel ? str(excel["Dietary Restrictions"] as string) : ""),
    "Allergies": str(csv[Object.keys(csv).find(k => k.startsWith("Allergies")) || ""] || "") || (excel ? findByPrefix(excel, "Allergies") : ""),
    "Current Medications": str(csv[Object.keys(csv).find(k => k.startsWith("Current Medications")) || ""] || "") || (excel ? findByPrefix(excel, "Current Medications") : ""),
    "Medical Conditions": str(csv[Object.keys(csv).find(k => k.startsWith("Medical Conditions")) || ""] || "") || (excel ? findByPrefix(excel, "Medical Conditions") : ""),

    // Additional medical (Excel only)
    "Recent Injuries": excel ? findByPrefix(excel, "Recent Injuries") : "",
    "Physical Limitations": excel ? findByPrefix(excel, "Physical Limitations") : "",
    "Last Tetanus Shot": excel ? findByPrefix(excel, "Date of Last Tetanus") : "",
    "Other Medical Needs": excel ? findByPrefix(excel, "Any other medical needs") : "",

    // Insurance (Excel only)
    "Has Insurance": excel ? findByPrefix(excel, "Does the participant have medical insurance") : "",
    "Insurance Provider": excel ? str(excel["Insurance Provider"] as string) : "",
    "Policy Number": excel ? str(excel["Policy Number"] as string) : "",
    "Insured Name (First)": excel ? str(excel["Name of Primary Insured* (First)"] as string) : "",
    "Insured Name (Last)": excel ? str(excel["Name of Primary Insured* (Last)"] as string) : "",
    "Insurance Phone": excel ? str(excel["Insurance Provider Phone"] as string) : "",

    // Permissions (Excel only)
    "First Aid Permission": excel ? findByPrefix(excel, "Do you give permission for camp staff to administer basic first aid") : "",
    "OTC Medication Permission": excel ? findByPrefix(excel, "Do you give permission for camp staff to provide over-the-counter") : "",
  });
}

// --- Write merged CSV ---
const output = Papa.unparse(merged);
fs.writeFileSync(outputPath, output, "utf-8");

console.log(`\nDone!`);
console.log(`  Matched: ${matchCount}`);
console.log(`  CSV-only (no Excel match): ${noMatchCount}`);
console.log(`  Output: ${outputPath}`);
console.log(`  Total rows: ${merged.length}`);
