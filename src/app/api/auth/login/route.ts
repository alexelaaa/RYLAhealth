import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { verifyPin } from "@/lib/auth";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

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
  await session.save();

  return NextResponse.json({
    success: true,
    role: result.role,
    label: result.label,
  });
}
