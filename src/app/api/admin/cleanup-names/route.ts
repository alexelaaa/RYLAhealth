import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

/**
 * Proper-case a name: title case with hyphen/apostrophe handling.
 */
function properCaseName(name: string): string {
  if (!name) return name;

  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(/(\s+|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      if (!part) return part;

      // Handle apostrophes (e.g., O'Brien, D'Angelo)
      const apostropheMatch = part.match(/^([A-Za-z])'(.+)$/);
      if (apostropheMatch) {
        return (
          apostropheMatch[1].toUpperCase() +
          "'" +
          apostropheMatch[2].charAt(0).toUpperCase() +
          apostropheMatch[2].slice(1).toLowerCase()
        );
      }

      // Handle Mc prefix (e.g., McDonald, McBride)
      const mcMatch = part.match(/^(mc)(.+)$/i);
      if (mcMatch) {
        return (
          "Mc" +
          mcMatch[2].charAt(0).toUpperCase() +
          mcMatch[2].slice(1).toLowerCase()
        );
      }

      // Handle Mac prefix (e.g., MacDonald) — only if 5+ chars to avoid "Mack" etc.
      const macMatch = part.match(/^(mac)(.{3,})$/i);
      if (macMatch) {
        return (
          "Mac" +
          macMatch[2].charAt(0).toUpperCase() +
          macMatch[2].slice(1).toLowerCase()
        );
      }

      // Standard title case
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

// GET: preview changes (dry run)
export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const campers = sqlite
    .prepare("SELECT id, first_name, last_name FROM campers")
    .all() as { id: number; first_name: string; last_name: string }[];

  const changes: { id: number; field: string; oldValue: string; newValue: string }[] = [];

  for (const camper of campers) {
    const newFirst = properCaseName(camper.first_name);
    const newLast = properCaseName(camper.last_name);

    if (newFirst !== camper.first_name) {
      changes.push({ id: camper.id, field: "first_name", oldValue: camper.first_name, newValue: newFirst });
    }
    if (newLast !== camper.last_name) {
      changes.push({ id: camper.id, field: "last_name", oldValue: camper.last_name, newValue: newLast });
    }
  }

  return NextResponse.json({ totalCampers: campers.length, totalChanges: changes.length, preview: changes.slice(0, 50) });
}

// POST: apply changes
export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const campers = sqlite
    .prepare("SELECT id, first_name, last_name FROM campers")
    .all() as { id: number; first_name: string; last_name: string }[];

  const now = new Date().toISOString();
  const changedBy = session.label || session.role;

  const updateFirst = sqlite.prepare("UPDATE campers SET first_name = ?, updated_at = ? WHERE id = ?");
  const updateLast = sqlite.prepare("UPDATE campers SET last_name = ?, updated_at = ? WHERE id = ?");
  const auditStmt = sqlite.prepare(
    "INSERT INTO camper_edits (camper_id, field_name, old_value, new_value, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let totalChanges = 0;

  const transaction = sqlite.transaction(() => {
    for (const camper of campers) {
      const newFirst = properCaseName(camper.first_name);
      const newLast = properCaseName(camper.last_name);

      if (newFirst !== camper.first_name) {
        updateFirst.run(newFirst, now, camper.id);
        auditStmt.run(camper.id, "first_name", camper.first_name, newFirst, changedBy, now);
        totalChanges++;
      }
      if (newLast !== camper.last_name) {
        updateLast.run(newLast, now, camper.id);
        auditStmt.run(camper.id, "last_name", camper.last_name, newLast, changedBy, now);
        totalChanges++;
      }
    }
  });

  transaction();

  return NextResponse.json({ success: true, totalChanges });
}
