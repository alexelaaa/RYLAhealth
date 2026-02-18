import * as XLSX from "xlsx";
import type { NewCamper } from "@/db/schema";

type RawRow = Record<string, string | number | undefined>;

function str(val: string | number | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function parseExcelDate(val: string | number | undefined): string {
  if (!val) return "";
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${date.m}/${date.d}/${date.y}`;
    }
  }
  return String(val).trim();
}

// Find a value by key prefix (handles long Excel column names)
function findByPrefix(row: RawRow, prefix: string): string | number | undefined {
  const key = Object.keys(row).find((k) => k.startsWith(prefix));
  return key ? row[key] : undefined;
}

export function parseRegistrationExcel(buffer: Buffer): NewCamper[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: RawRow[] = XLSX.utils.sheet_to_json(ws);

  return rows.map((row) => ({
    uniqueRegistrationId: str(row["Unique ID"]),
    firstName: str(row["Participant Name (First)"]),
    lastName: str(row["Participant Name (Last)"]),
    birthDate: parseExcelDate(row["Participant Name Birth Date"]),
    gender: str(row["Participant Gender"]),
    email: str(row["Participant Email"]),
    cellPhone: str(row["Participant Cell Phone Number"]),
    addressStreet: str(row["Participant Home Address (Address)"]),
    addressCity: str(row["Participant Home Address (City)"]),
    addressState: str(row["Participant Home Address (State)"]),
    addressZip: str(row["Participant Home Address (Zip)"]),
    school: str(row["Name of Participant's School"]),
    gradeLevel: str(row["Participant Grade Level"]),
    guardianFirstName: str(row["Guardian Name (First)"]),
    guardianLastName: str(row["Guardian Name (Last)"]),
    guardianEmail: str(row["Guardian Email"]),
    guardianPhone: str(row["Guardian Phone"]),
    emergencyFirstName: str(row["Emergency Contact Name (First)"]),
    emergencyLastName: str(row["Emergency Contact Name (Last)"]),
    emergencyRelationship: str(
      row["Emergency Contact Relationship to Participant"]
    ),
    emergencyPhone: str(row["Emergency Contact Phone"]),
    rotaryClubConfirmed: str(row["Rotary Club Confirmed"]),
    sponsoringRotaryClub: str(row["Sponsoring Rotary Club"]),
    sponsoringClubCode: str(
      findByPrefix(row, "Sponsoring Rotary Club Verification Code")
    ),
    campWeekend: str(
      findByPrefix(row, "Please select which RYLA weekend")
    ),
    campDateFlexibility: str(findByPrefix(row, "Camp Date Flexibility")),
    role: str(row["Role of Participant"]) || "Camper",
    hasRelativeAttending: str(
      findByPrefix(row, "Does the participant have a relative")
    ),
    relativeFirstName: str(row["Relative Name (First)"]),
    relativeLastName: str(row["Relative Name (Last)"]),
    relativeRole: str(row["Relative Role"]),
    dietaryRestrictions: str(row["Dietary Restrictions"]),
    allergies: str(
      findByPrefix(row, "Allergies")
    ),
    currentMedications: str(
      findByPrefix(row, "Current Medications")
    ),
    medicalConditions: str(
      findByPrefix(row, "Medical Conditions")
    ),
    recentInjuries: str(
      findByPrefix(row, "Recent Injuries")
    ),
    physicalLimitations: str(
      findByPrefix(row, "Physical Limitations")
    ),
    lastTetanusShot: str(findByPrefix(row, "Date of Last Tetanus")),
    otherMedicalNeeds: str(
      findByPrefix(row, "Any other medical needs")
    ),
    hasInsurance: str(
      findByPrefix(row, "Does the participant have medical insurance")
    ),
    insuranceProvider: str(row["Insurance Provider"]),
    policyNumber: str(row["Policy Number"]),
    insuredFirstName: str(row["Name of Primary Insured* (First)"]),
    insuredLastName: str(row["Name of Primary Insured* (Last)"]),
    insurancePhone: str(row["Insurance Provider Phone"]),
    firstAidPermission: str(
      findByPrefix(row, "Do you give permission for camp staff to administer basic first aid")
    ),
    otcMedicationPermission: str(
      findByPrefix(row, "Do you give permission for camp staff to provide over-the-counter")
    ),
    waiverAgreement: str(
      findByPrefix(row, "Waiver, Release")
    ),
    codeOfEthics: str(row["RYLA Camper Code of Ethics"]),
    registrationTime: parseExcelDate(row["Time"]),
  }));
}
