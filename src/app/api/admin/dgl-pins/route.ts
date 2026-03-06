import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { sqlite } from "@/db";
import { hashSync } from "bcryptjs";

interface SmallGroupRow {
  id: number;
  small_group: string;
  dgl_first_name: string | null;
  dgl_last_name: string | null;
  dgl_cabin: string | null;
  camp_weekend: string | null;
}

interface StaffPinRow {
  id: number;
  label: string;
  role: string;
}

function generateDglPin(dglCabin: string, existingPins: Set<string>): string {
  // Extract cabin number and letter: "Cabin 16C" or "Cabin 16 C" → 16, C
  const match = dglCabin.match(/(\d+)\s*([A-Za-z])/);
  if (!match) {
    // Fallback: random 4-digit PIN
    for (let i = 0; i < 100; i++) {
      const pin = String(1000 + Math.floor(Math.random() * 9000));
      if (!existingPins.has(pin)) return pin;
    }
    return String(1000 + Math.floor(Math.random() * 9000));
  }

  const cabinNum = match[1];
  const letter = match[2].toUpperCase();
  const letterDigit = letter.charCodeAt(0) - "A".charCodeAt(0) + 1;

  // Try random digits 0-9
  for (let r = 0; r <= 9; r++) {
    const pin = `${cabinNum}${letterDigit}${r}`;
    if (!existingPins.has(pin)) return pin;
  }

  // If all taken, add extra random digit
  for (let i = 0; i < 100; i++) {
    const extra = Math.floor(Math.random() * 10);
    const pin = `${cabinNum}${letterDigit}${extra}${Math.floor(Math.random() * 10)}`;
    if (!existingPins.has(pin)) return pin;
  }

  return `${cabinNum}${letterDigit}0`;
}

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get all DGL small group info
  const groups = sqlite.prepare(
    `SELECT id, small_group, dgl_first_name, dgl_last_name, dgl_cabin, camp_weekend
     FROM small_group_info WHERE dgl_first_name IS NOT NULL AND dgl_first_name != ''`
  ).all() as SmallGroupRow[];

  // Get existing DGL pins
  const dglPins = sqlite.prepare(
    `SELECT id, label, role FROM staff_pins WHERE role = 'dgl'`
  ).all() as StaffPinRow[];

  const pinLabels = new Set(dglPins.map((p) => p.label));

  const dgls = groups.map((g) => {
    const name = `${g.dgl_first_name} ${g.dgl_last_name}`;
    const label = `DGL: ${name} (${g.dgl_cabin || "No Cabin"})`;
    return {
      id: g.id,
      name,
      cabin: g.dgl_cabin,
      smallGroup: g.small_group,
      campWeekend: g.camp_weekend,
      hasPin: pinLabels.has(label),
      label,
    };
  });

  return NextResponse.json({ dgls });
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { dglId } = body; // Optional: generate for specific DGL, otherwise generate all

  const groups = sqlite.prepare(
    `SELECT id, small_group, dgl_first_name, dgl_last_name, dgl_cabin, camp_weekend
     FROM small_group_info WHERE dgl_first_name IS NOT NULL AND dgl_first_name != ''
     ${dglId ? "AND id = ?" : ""}`
  ).all(...(dglId ? [dglId] : [])) as SmallGroupRow[];

  // Collect all existing PIN plaintext values we can't check (they're hashed),
  // so track generated ones to avoid collisions
  const generatedPins = new Set<string>();
  const results: { name: string; cabin: string | null; pin: string; label: string }[] = [];

  for (const g of groups) {
    if (!g.dgl_cabin) continue;

    const name = `${g.dgl_first_name} ${g.dgl_last_name}`;
    const label = `DGL: ${name} (${g.dgl_cabin})`;

    // Remove existing PIN for this DGL if regenerating
    sqlite.prepare(`DELETE FROM staff_pins WHERE label = ? AND role = 'dgl'`).run(label);

    const pin = generateDglPin(g.dgl_cabin, generatedPins);
    generatedPins.add(pin);

    const pinHash = hashSync(pin, 10);
    sqlite.prepare(
      `INSERT INTO staff_pins (label, pin_hash, role) VALUES (?, ?, 'dgl')`
    ).run(label, pinHash);

    results.push({ name, cabin: g.dgl_cabin, pin, label });
  }

  return NextResponse.json({ generated: results });
}

// PATCH: replace a DGL (update name in small_group_info + regenerate PIN)
export async function PATCH(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { groupId, oldLabel, newFirstName, newLastName } = await request.json();
  if (!groupId || !newFirstName || !newLastName) {
    return NextResponse.json({ error: "groupId, newFirstName, newLastName required" }, { status: 400 });
  }

  // Update name in small_group_info
  sqlite.prepare(
    `UPDATE small_group_info SET dgl_first_name = ?, dgl_last_name = ? WHERE id = ?`
  ).run(newFirstName.trim(), newLastName.trim(), groupId);

  // Delete old PIN if it exists
  if (oldLabel) {
    sqlite.prepare(`DELETE FROM staff_pins WHERE label = ? AND role = 'dgl'`).run(oldLabel);
  }

  // Get updated row to generate new PIN
  const row = sqlite.prepare(
    `SELECT id, small_group, dgl_first_name, dgl_last_name, dgl_cabin, camp_weekend FROM small_group_info WHERE id = ?`
  ).get(groupId) as SmallGroupRow | undefined;

  if (!row || !row.dgl_cabin) {
    return NextResponse.json({ success: true, message: "Updated but no cabin for PIN generation" });
  }

  const name = `${row.dgl_first_name} ${row.dgl_last_name}`;
  const label = `DGL: ${name} (${row.dgl_cabin})`;
  const pin = generateDglPin(row.dgl_cabin, new Set<string>());
  const pinHash = hashSync(pin, 10);

  sqlite.prepare(
    `INSERT INTO staff_pins (label, pin_hash, role) VALUES (?, ?, 'dgl')`
  ).run(label, pinHash);

  return NextResponse.json({ success: true, name, cabin: row.dgl_cabin, pin, label });
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

  sqlite.prepare(`DELETE FROM staff_pins WHERE label = ? AND role = 'dgl'`).run(label);
  return NextResponse.json({ success: true });
}
