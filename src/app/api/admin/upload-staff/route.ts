import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { sqlite } from "@/db";
import Papa from "papaparse";

function str(val: string | undefined): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

/** Flexible column lookup — matches common variants like "First Name", "first_name", "FirstName" */
function findCol(row: Record<string, string | undefined>, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const lower = c.toLowerCase().replace(/[_ ]/g, "");
    const match = keys.find((k) => k.toLowerCase().replace(/[_ ]/g, "") === lower);
    if (match && str(row[match])) return str(row[match]);
  }
  return "";
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const confirm = formData.get("confirm") === "true";
  const weekend = str((formData.get("weekend") as string) ?? "") || null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string | undefined>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  // Build valid rows — must have at least first + last name
  const validRows = parsed.data
    .map((row) => ({
      firstName: findCol(row, "First Name", "first_name", "FirstName", "First"),
      lastName: findCol(row, "Last Name", "last_name", "LastName", "Last"),
      staffType: findCol(row, "Staff Type", "staff_type", "StaffType", "Type") || "alumni",
      staffRole: findCol(row, "Staff Role", "staff_role", "StaffRole", "Role"),
      phone: findCol(row, "Phone", "phone_number", "PhoneNumber"),
      email: findCol(row, "Email", "email_address", "EmailAddress"),
    }))
    .filter((r) => r.firstName && r.lastName);

  if (validRows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found. CSV must have First Name and Last Name columns." },
      { status: 400 },
    );
  }

  // Normalize staffType to alumni|adult
  for (const row of validRows) {
    const t = row.staffType.toLowerCase();
    row.staffType = t === "adult" ? "adult" : "alumni";
  }

  // Look up existing staff for new/update counts
  const existing = sqlite
    .prepare("SELECT id, first_name, last_name FROM camp_staff")
    .all() as { id: number; first_name: string; last_name: string }[];

  const existingMap = new Map<string, number>();
  for (const s of existing) {
    existingMap.set(`${s.first_name.toLowerCase()}|${s.last_name.toLowerCase()}`, s.id);
  }

  let newCount = 0;
  let updateCount = 0;
  for (const row of validRows) {
    const key = `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}`;
    if (existingMap.has(key)) {
      updateCount++;
    } else {
      newCount++;
    }
  }

  if (!confirm) {
    return NextResponse.json({
      preview: true,
      totalParsed: validRows.length,
      newCount,
      updateCount,
    });
  }

  // Confirm mode — upsert
  const now = new Date().toISOString();

  const insertStmt = sqlite.prepare(`
    INSERT INTO camp_staff (first_name, last_name, staff_type, staff_role, phone, email, camp_weekend, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = sqlite.prepare(`
    UPDATE camp_staff SET staff_type = ?, staff_role = ?, phone = COALESCE(NULLIF(?, ''), phone),
      email = COALESCE(NULLIF(?, ''), email), camp_weekend = COALESCE(?, camp_weekend), updated_at = ?
    WHERE id = ?
  `);

  let inserted = 0;
  let updated = 0;

  const tx = sqlite.transaction(() => {
    for (const row of validRows) {
      const key = `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        updateStmt.run(
          row.staffType,
          row.staffRole || null,
          row.phone || "",
          row.email || "",
          weekend,
          now,
          existingId,
        );
        updated++;
      } else {
        insertStmt.run(
          row.firstName,
          row.lastName,
          row.staffType,
          row.staffRole || null,
          row.phone || null,
          row.email || null,
          weekend,
          now,
          now,
        );
        inserted++;
      }
    }
  });

  tx();

  return NextResponse.json({ success: true, inserted, updated });
}
