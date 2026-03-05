import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";
import webpush from "web-push";

interface PushRow {
  id: number;
  endpoint: string;
  subscription_json: string;
}

function setupVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:admin@ryla5330.org", publicKey, privateKey);
  return true;
}

// GET: check if a bus is marked complete
export async function GET(request: NextRequest) {
  const busNumber = request.nextUrl.searchParams.get("bus");
  if (!busNumber) {
    return NextResponse.json({ error: "bus param required" }, { status: 400 });
  }

  const row = sqlite
    .prepare("SELECT completed_at, completed_by FROM bus_checkin_status WHERE bus_number = ?")
    .get(busNumber) as { completed_at: string; completed_by: string } | undefined;

  return NextResponse.json({
    complete: !!row,
    completedAt: row?.completed_at || null,
    completedBy: row?.completed_by || null,
  });
}

// POST: mark bus check-in as complete (sends push to admins)
export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { busNumber, complete } = await request.json();
  if (!busNumber) {
    return NextResponse.json({ error: "busNumber required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const userLabel = session.label || session.role;

  if (complete) {
    sqlite
      .prepare(
        `INSERT INTO bus_checkin_status (bus_number, completed_at, completed_by)
         VALUES (?, ?, ?)
         ON CONFLICT(bus_number) DO UPDATE SET completed_at = excluded.completed_at, completed_by = excluded.completed_by`
      )
      .run(busNumber, now, userLabel);

    // Send push notification to admins
    if (setupVapid()) {
      const adminSubs = sqlite
        .prepare("SELECT id, endpoint, subscription_json FROM push_subscriptions WHERE role = 'admin'")
        .all() as PushRow[];

      const payload = JSON.stringify({
        title: `Bus ${busNumber} Check-In Complete`,
        body: `All campers checked in by ${userLabel}`,
        url: "/admin/bus-map",
      });

      await Promise.allSettled(
        adminSubs.map(async (row) => {
          try {
            const sub = JSON.parse(row.subscription_json);
            await webpush.sendNotification(sub, payload);
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              sqlite.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(row.id);
            }
          }
        })
      );
    }
  } else {
    sqlite.prepare("DELETE FROM bus_checkin_status WHERE bus_number = ?").run(busNumber);

    // Notify admins of unlock too
    if (setupVapid()) {
      const adminSubs = sqlite
        .prepare("SELECT id, endpoint, subscription_json FROM push_subscriptions WHERE role = 'admin'")
        .all() as PushRow[];

      const payload = JSON.stringify({
        title: `Bus ${busNumber} Reopened`,
        body: `Check-in unlocked by ${userLabel}`,
        url: "/admin/bus-map",
      });

      await Promise.allSettled(
        adminSubs.map(async (row) => {
          try {
            const sub = JSON.parse(row.subscription_json);
            await webpush.sendNotification(sub, payload);
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              sqlite.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(row.id);
            }
          }
        })
      );
    }
  }

  return NextResponse.json({ success: true, complete });
}
