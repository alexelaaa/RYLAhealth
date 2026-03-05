import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { verifyPin } from "@/lib/auth";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import { sqlite } from "@/db";
import { CAMP_WEEKENDS } from "@/lib/constants";

function getCurrentWeekend(): string {
  const now = new Date();
  const year = now.getFullYear();
  // March 6-8 weekend: auto-select if before May 1
  // May 15-17 weekend: auto-select if May 1 or later
  const mayCutoff = new Date(year, 4, 1); // May 1
  return now < mayCutoff ? CAMP_WEEKENDS[0] : CAMP_WEEKENDS[1];
}

interface SmallGroupRow {
  small_group: string;
  dgl_cabin: string | null;
  camp_weekend: string | null;
}

export async function POST(request: Request) {
  const { pin } = await request.json();

  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const result = await verifyPin(pin);

  if (!result.valid) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  session.isLoggedIn = true;
  session.role = result.role;
  session.label = result.label;

  // For DGL role, look up cabin and small group from label
  if (result.role === "dgl") {
    // Label format: "DGL: FirstName LastName (Cabin 16C)"
    const nameMatch = result.label.match(/^DGL:\s*(.+?)\s*\(/);
    if (nameMatch) {
      const fullName = nameMatch[1].trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");

      try {
        const row = sqlite.prepare(
          `SELECT small_group, dgl_cabin, camp_weekend FROM small_group_info
           WHERE dgl_first_name = ? AND dgl_last_name = ? LIMIT 1`
        ).get(firstName, lastName) as SmallGroupRow | undefined;

        if (row) {
          session.dglCabin = row.dgl_cabin || undefined;
          session.dglSmallGroup = row.small_group || undefined;
          session.campWeekend = row.camp_weekend || undefined;
        }
      } catch {
        // Table may not exist yet
      }
    }
  }

  // Auto-set weekend based on current date if not already set (e.g. for bussing role)
  if (!session.campWeekend) {
    session.campWeekend = getCurrentWeekend();
  }

  await session.save();

  return NextResponse.json({
    success: true,
    role: result.role,
    label: result.label,
    dglCabin: session.dglCabin,
  });
}
