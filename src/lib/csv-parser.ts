import Papa from "papaparse";
import type { NewCamper } from "@/db/schema";

type RawRow = Record<string, string | undefined>;

function str(val: string | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

/** Try multiple column names, return the first non-empty match */
function col(row: RawRow, ...names: string[]): string {
  for (const name of names) {
    const val = row[name];
    if (val !== undefined && val !== null && String(val).trim()) {
      return String(val).trim();
    }
  }
  return "";
}

/** Find a column value by prefix (handles variations in column headers) */
function findByPrefix(row: RawRow, prefix: string): string | undefined {
  const key = Object.keys(row).find((k) => k.startsWith(prefix));
  return key ? row[key] : undefined;
}

/** Try col() first, then fall back to findByPrefix */
function colOrPrefix(row: RawRow, prefix: string, ...exactNames: string[]): string {
  const exact = col(row, ...exactNames);
  if (exact) return exact;
  return str(findByPrefix(row, prefix));
}

/** Derive bus number from bus stop: "2A"→"2", "3B"→"3", "1"→"1" */
function deriveBusNumber(busStop: string): string {
  if (!busStop) return "";
  const trimmed = busStop.trim();
  // Strip trailing letter (A/B) for multi-stop buses
  const match = trimmed.match(/^(\d+)[A-Za-z]?$/);
  return match ? match[1] : trimmed;
}

/** Generate a unique registration ID from first + last name */
function generateUniqueId(firstName: string, lastName: string): string {
  const normalized = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
  return normalized || `unknown-${Date.now()}`;
}

/** Normalize camp weekend strings to consistent format */
function normalizeCampWeekend(raw: string): string {
  if (!raw) return "March";
  const lower = raw.toLowerCase();
  if (lower.includes("march") || lower.includes("mar")) return "March 6th-8th";
  if (lower.includes("may")) return "May 15th-17th";
  return raw;
}

/** Normalize role strings */
function normalizeRole(raw: string): string {
  if (!raw) return "Camper";
  const lower = raw.toLowerCase();
  if (lower.includes("camper")) return "Camper";
  if (lower.includes("alternate")) return "Alternate";
  if (lower.includes("dgl") || lower.includes("discussion group")) return "DGL (Discussion Group Leader)";
  return raw;
}

export function parseRegistrationCsv(csvText: string): NewCamper[] {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return result.data
    .filter((row) => {
      // Skip rows with no name — support both cleaned and raw column names
      const first = col(row, "First", "Participant Name (First)");
      const last = col(row, "Last", "Participant Name (Last)");
      return first && last;
    })
    .map((row) => {
      const firstName = col(row, "First", "Participant Name (First)");
      const lastName = col(row, "Last", "Participant Name (Last)");
      const busStop = col(row, "Bus Stop");

      // Camp weekend: raw export uses full question text
      const rawWeekend = colOrPrefix(row, "Please select which RYLA weekend", "Camp");
      const rawRole = col(row, "Role", "Role of Participant");

      return {
        uniqueRegistrationId: generateUniqueId(firstName, lastName),
        firstName,
        lastName,
        birthDate: col(row, "DOB", "Participant Name Birth Date"),
        gender: col(row, "Gender", "Participant Gender"),
        email: col(row, "Participant Email"),
        cellPhone: col(row, "Participant Cell", "Participant Cell Phone Number"),
        // Address
        addressStreet: col(row, "Address Street", "Participant Home Address (Address)"),
        addressCity: col(row, "Participant City", "Participant Home Address (City)"),
        addressState: col(row, "Address State", "Participant Home Address (State)"),
        addressZip: col(row, "Address Zip", "Participant Home Address (Zip)"),
        school: col(row, "High School", "Name of Participant's School"),
        gradeLevel: col(row, "Participant Grade Level"),
        // Guardian
        guardianFirstName: col(row, "Guardian Name (First)"),
        guardianLastName: col(row, "Guardian Name (Last)"),
        guardianEmail: col(row, "Guardian Email"),
        guardianPhone: col(row, "Guardian Phone"),
        // Emergency contact
        emergencyFirstName: col(row, "Emergency Contact (First)", "Emergency Contact Name (First)"),
        emergencyLastName: col(row, "Emergency Contact (Last)", "Emergency Contact Name (Last)"),
        emergencyRelationship: colOrPrefix(row, "Emergency Contact Relationship", "Emergency Contact Relationship"),
        emergencyPhone: col(row, "Emergency Contact Phone"),
        // Rotary
        sponsoringRotaryClub: col(row, "Sponsoring Rotary Club"),
        // Camp
        campWeekend: normalizeCampWeekend(rawWeekend),
        role: normalizeRole(rawRole),
        hasRelativeAttending: colOrPrefix(row, "Does the participant have a relative attending", "Relative attending camp?"),
        relativeFirstName: col(row, "Relative Name (First)"),
        relativeLastName: col(row, "Relative Name (Last)"),
        relativeRole: col(row, "Relative Role"),
        // Medical
        dietaryRestrictions: col(row, "Dietary Restrictions"),
        allergies: colOrPrefix(row, "Allergies"),
        currentMedications: colOrPrefix(row, "Current Medications"),
        medicalConditions: colOrPrefix(row, "Medical Conditions"),
        recentInjuries: colOrPrefix(row, "Recent Injuries"),
        physicalLimitations: colOrPrefix(row, "Physical Limitations"),
        lastTetanusShot: colOrPrefix(row, "Date of Last Tetanus Shot", "Last Tetanus Shot"),
        otherMedicalNeeds: colOrPrefix(row, "Any other medical needs", "Other Medical Needs"),
        // Insurance
        hasInsurance: colOrPrefix(row, "Does the participant have medical insurance", "Has Insurance"),
        insuranceProvider: col(row, "Insurance Provider"),
        policyNumber: col(row, "Policy Number"),
        insuredFirstName: col(row, "Insured Name (First)", "Name of Primary Insured* (First)"),
        insuredLastName: col(row, "Insured Name (Last)", "Name of Primary Insured* (Last)"),
        insurancePhone: col(row, "Insurance Phone", "Insurance Provider Phone"),
        // Permissions
        firstAidPermission: colOrPrefix(row, "Do you give permission for camp staff to administer basic first aid", "First Aid Permission"),
        otcMedicationPermission: colOrPrefix(row, "Do you give permission for camp staff to provide over-the-counter", "OTC Medication Permission"),
        // Camp assignment (only in cleaned CSVs, not in raw exports)
        largeGroup: col(row, "Large Group"),
        smallGroup: col(row, "Small Group"),
        cabinName: col(row, "Cabin Name"),
        cabinLocation: col(row, "Cabin Location"),
        busStop,
        busStopLocation: col(row, "Bus Stop Location"),
        busStopAddress: col(row, "Bus Stop Address"),
        pickupTime: col(row, "Pickup Time"),
        dropoffTime: col(row, "Drop Off Time"),
        busNumber: deriveBusNumber(busStop),
      };
    });
}
