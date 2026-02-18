import * as XLSX from "xlsx";

export interface SupplementaryRecord {
  identifier: string; // uniqueRegistrationId or name fallback
  firstName?: string;
  lastName?: string;
  largeGroup: string;
  smallGroup: string;
  cabinNumber: string;
  busNumber: string;
}

function findByPrefix(headers: string[], prefix: string): string | null {
  const lower = prefix.toLowerCase();
  return headers.find((h) => h.toLowerCase().startsWith(lower)) || null;
}

export function parseSupplementaryExcel(buffer: Buffer): SupplementaryRecord[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);

  // Try to find columns by prefix matching
  const idCol = findByPrefix(headers, "unique") || findByPrefix(headers, "registration id");
  const firstNameCol = findByPrefix(headers, "first name") || findByPrefix(headers, "first");
  const lastNameCol = findByPrefix(headers, "last name") || findByPrefix(headers, "last");
  const largeGroupCol = findByPrefix(headers, "large group") || findByPrefix(headers, "large");
  const smallGroupCol = findByPrefix(headers, "small group") || findByPrefix(headers, "small");
  const cabinCol = findByPrefix(headers, "cabin");
  const busCol = findByPrefix(headers, "bus");

  return rows.map((row) => {
    const identifier = idCol ? String(row[idCol] || "").trim() : "";
    const firstName = firstNameCol ? String(row[firstNameCol] || "").trim() : "";
    const lastName = lastNameCol ? String(row[lastNameCol] || "").trim() : "";

    return {
      identifier: identifier || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      largeGroup: largeGroupCol ? String(row[largeGroupCol] || "").trim() : "",
      smallGroup: smallGroupCol ? String(row[smallGroupCol] || "").trim() : "",
      cabinNumber: cabinCol ? String(row[cabinCol] || "").trim() : "",
      busNumber: busCol ? String(row[busCol] || "").trim() : "",
    };
  }).filter((r) => r.identifier);
}
