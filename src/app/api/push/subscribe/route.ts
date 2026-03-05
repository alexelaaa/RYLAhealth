import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { subscription } = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const userLabel = session.label || session.role;
  const role = session.role;

  sqlite
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, subscription_json, user_label, role, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         subscription_json = excluded.subscription_json,
         user_label = excluded.user_label,
         role = excluded.role,
         created_at = excluded.created_at`
    )
    .run(subscription.endpoint, JSON.stringify(subscription), userLabel, role, now);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { endpoint } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
  }

  sqlite.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  return NextResponse.json({ success: true });
}
