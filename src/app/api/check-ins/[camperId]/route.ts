import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { camperId: string } }
) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const camperId = parseInt(params.camperId);
  if (isNaN(camperId)) {
    return NextResponse.json({ error: "Invalid camper ID" }, { status: 400 });
  }

  // Check if check-in is locked (non-admin users blocked)
  if (session.role !== "admin") {
    const lock = sqlite
      .prepare("SELECT value FROM app_settings WHERE key = 'checkin_locked'")
      .get() as { value: string } | undefined;
    if (lock?.value === "true") {
      return NextResponse.json({ error: "Check-in is locked" }, { status: 403 });
    }
  }

  // Get check-in record before deleting for audit trail
  const existing = sqlite
    .prepare("SELECT checked_in_at, checked_in_by, camp_arrived_at, camp_arrived_by FROM check_ins WHERE camper_id = ?")
    .get(camperId) as { checked_in_at: string; checked_in_by: string; camp_arrived_at: string | null; camp_arrived_by: string | null } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "No check-in found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const changedBy = session.label || session.role;

  const transaction = sqlite.transaction(() => {
    // Audit trail: log what was undone
    const oldValue = existing.camp_arrived_at
      ? `checked_in: ${existing.checked_in_at} by ${existing.checked_in_by}, arrived: ${existing.camp_arrived_at} by ${existing.camp_arrived_by}`
      : `checked_in: ${existing.checked_in_at} by ${existing.checked_in_by}`;

    sqlite
      .prepare(
        "INSERT INTO camper_edits (camper_id, field_name, old_value, new_value, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(camperId, "check_in_undo", oldValue, null, changedBy, now);

    // Delete the check-in
    sqlite.prepare("DELETE FROM check_ins WHERE camper_id = ?").run(camperId);
  });

  transaction();

  return NextResponse.json({ success: true });
}
