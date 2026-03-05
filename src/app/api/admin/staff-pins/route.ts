import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { sqlite } from "@/db";
import { hashSync } from "bcryptjs";

interface CampStaffRow {
  id: number;
  first_name: string;
  last_name: string;
  staff_type: string;
  staff_role: string | null;
  camp_weekend: string | null;
}

interface StaffPinRow {
  id: number;
  label: string;
  role: string;
}

function generateRandomPin(existingPins: Set<string>): string {
  for (let i = 0; i < 100; i++) {
    const pin = String(1000 + Math.floor(Math.random() * 9000));
    if (!existingPins.has(pin)) return pin;
  }
  return String(1000 + Math.floor(Math.random() * 9000));
}

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const staff = sqlite.prepare(
    `SELECT id, first_name, last_name, staff_type, staff_role, camp_weekend
     FROM camp_staff WHERE staff_type = 'adult'`
  ).all() as CampStaffRow[];

  const staffPins = sqlite.prepare(
    `SELECT id, label, role FROM staff_pins WHERE role = 'staff'`
  ).all() as StaffPinRow[];

  const pinLabels = new Set(staffPins.map((p) => p.label));

  const result = staff.map((s) => {
    const name = `${s.first_name} ${s.last_name}`;
    const label = `Staff: ${name}`;
    return {
      id: s.id,
      name,
      staffRole: s.staff_role,
      campWeekend: s.camp_weekend,
      hasPin: pinLabels.has(label),
      label,
    };
  });

  return NextResponse.json({ staff: result });
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { staffId } = body;

  const staff = sqlite.prepare(
    `SELECT id, first_name, last_name, staff_type, staff_role, camp_weekend
     FROM camp_staff WHERE staff_type = 'adult'
     ${staffId ? "AND id = ?" : ""}`
  ).all(...(staffId ? [staffId] : [])) as CampStaffRow[];

  const generatedPins = new Set<string>();
  const results: { name: string; staffRole: string | null; pin: string; label: string }[] = [];

  for (const s of staff) {
    const name = `${s.first_name} ${s.last_name}`;
    const label = `Staff: ${name}`;

    sqlite.prepare(`DELETE FROM staff_pins WHERE label = ? AND role = 'staff'`).run(label);

    const pin = generateRandomPin(generatedPins);
    generatedPins.add(pin);

    const pinHash = hashSync(pin, 10);
    sqlite.prepare(
      `INSERT INTO staff_pins (label, pin_hash, role) VALUES (?, ?, 'staff')`
    ).run(label, pinHash);

    results.push({ name, staffRole: s.staff_role, pin, label });
  }

  return NextResponse.json({ generated: results });
}

export async function DELETE(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { label } = await request.json();
  if (!label) {
    return NextResponse.json({ error: "Label required" }, { status: 400 });
  }

  sqlite.prepare(`DELETE FROM staff_pins WHERE label = ? AND role = 'staff'`).run(label);
  return NextResponse.json({ success: true });
}
