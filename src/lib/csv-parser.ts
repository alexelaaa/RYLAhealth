import Papa from "papaparse";
import type { NewCamper } from "@/db/schema";

type RawRow = Record<string, string | undefined>;

function str(val: string | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

/** Find a column value by prefix (handles variations in column headers) */
function findByPrefix(row: RawRow, prefix: string): string | undefined {
  const key = Object.keys(row).find((k) => k.startsWith(prefix));
  return key ? row[key] : undefined;
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

export function parseRegistrationCsv(csvText: string): NewCamper[] {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return result.data
    .filter((row) => {
      // Skip rows with no name
      const first = str(row["First"]);
      const last = str(row["Last"]);
      return first && last;
    })
    .map((row) => {
      const firstName = str(row["First"]);
      const lastName = str(row["Last"]);
      const busStop = str(row["Bus Stop"]);

      return {
        uniqueRegistrationId: generateUniqueId(firstName, lastName),
        firstName,
        lastName,
        birthDate: str(row["DOB"]),
        gender: str(row["Gender"]),
        email: str(row["Participant Email"]),
        cellPhone: str(row["Participant Cell"]),
        // Address
        addressStreet: str(row["Address Street"]),
        addressCity: str(row["Participant City"]),
        addressState: str(row["Address State"]),
        addressZip: str(row["Address Zip"]),
        school: str(row["High School"]),
        gradeLevel: str(row["Participant Grade Level"]),
        // Guardian
        guardianFirstName: str(row["Guardian Name (First)"]),
        guardianLastName: str(row["Guardian Name (Last)"]),
        guardianEmail: str(row["Guardian Email"]),
        guardianPhone: str(row["Guardian Phone"]),
        // Emergency contact
        emergencyFirstName: str(row["Emergency Contact (First)"]),
        emergencyLastName: str(row["Emergency Contact (Last)"]),
        emergencyRelationship: str(row["Emergency Contact Relationship"]),
        emergencyPhone: str(row["Emergency Contact Phone"]),
        // Rotary
        sponsoringRotaryClub: str(row["Sponsoring Rotary Club"]),
        // Camp
        campWeekend: str(row["Camp"]) || "March",
        role: str(row["Role"]) || "Camper",
        hasRelativeAttending: str(row["Relative attending camp?"]) || str(findByPrefix(row, "Relative attending")),
        relativeFirstName: str(row["Relative Name (First)"]),
        relativeLastName: str(row["Relative Name (Last)"]),
        relativeRole: str(row["Relative Role"]),
        // Medical
        dietaryRestrictions: str(row["Dietary Restrictions"]),
        allergies: str(findByPrefix(row, "Allergies")),
        currentMedications: str(findByPrefix(row, "Current Medications")),
        medicalConditions: str(findByPrefix(row, "Medical Conditions")),
        recentInjuries: str(row["Recent Injuries"]),
        physicalLimitations: str(row["Physical Limitations"]),
        lastTetanusShot: str(row["Last Tetanus Shot"]),
        otherMedicalNeeds: str(row["Other Medical Needs"]),
        // Insurance
        hasInsurance: str(row["Has Insurance"]),
        insuranceProvider: str(row["Insurance Provider"]),
        policyNumber: str(row["Policy Number"]),
        insuredFirstName: str(row["Insured Name (First)"]),
        insuredLastName: str(row["Insured Name (Last)"]),
        insurancePhone: str(row["Insurance Phone"]),
        // Permissions
        firstAidPermission: str(row["First Aid Permission"]),
        otcMedicationPermission: str(row["OTC Medication Permission"]),
        // Camp assignment
        largeGroup: str(row["Large Group"]),
        smallGroup: str(row["Small Group"]),
        cabinName: str(row["Cabin Name"]),
        cabinLocation: str(row["Cabin Location"]),
        busStop,
        busStopLocation: str(row["Bus Stop Location"]) || str(row["Location"]),
        busStopAddress: str(row["Bus Stop Address"]) || str(row["Address"]),
        pickupTime: str(row["Pickup Time"]),
        dropoffTime: str(row["Drop Off Time"]),
        busNumber: deriveBusNumber(busStop),
      };
    });
}
