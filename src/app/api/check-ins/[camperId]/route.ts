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

  sqlite.prepare("DELETE FROM check_ins WHERE camper_id = ?").run(camperId);

  return NextResponse.json({ success: true });
}
