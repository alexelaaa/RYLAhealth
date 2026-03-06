import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const rows = sqlite
    .prepare("SELECT id, label, role, pin_hash FROM staff_pins ORDER BY pin_hash")
    .all() as { id: number; label: string; role: string; pin_hash: string }[];

  const groups: Record<string, { id: number; label: string; role: string }[]> = {};
  for (const r of rows) {
    if (!groups[r.pin_hash]) groups[r.pin_hash] = [];
    groups[r.pin_hash].push({ id: r.id, label: r.label, role: r.role });
  }

  const duplicates = Object.values(groups).filter((g) => g.length > 1);

  return NextResponse.json({
    totalPins: rows.length,
    duplicateGroups: duplicates.length,
    duplicates,
  });
}
