import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { sqlite } from "@/db";
import {
  getCampDay,
  getDetailedSchedule,
  type DetailedEvent,
} from "@/lib/schedule";
import { CAMP_LOCATION } from "@/lib/constants";
import { haversineDistanceMiles, estimateEtaMinutes } from "@/lib/geo-utils";

const CRON_SECRET = process.env.CRON_SECRET;

interface PushRow {
  id: number;
  endpoint: string;
  subscription_json: string;
  role: string;
}

interface BusWaypointRow {
  bus_id: string;
  bus_label: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
}

function setupVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:admin@ryla5330.org", publicKey, privateKey);
  return true;
}

function parseEventTime(timeStr: string): number | null {
  // Parse "8:00 – 9:00" or "12:00" format → minutes from midnight for the start time
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

async function sendToSubscriptions(rows: PushRow[], payload: string) {
  const results = await Promise.allSettled(
    rows.map(async (row) => {
      try {
        const sub = JSON.parse(row.subscription_json);
        await webpush.sendNotification(sub, payload);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired — remove it
          sqlite.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(row.id);
        }
      }
    })
  );
  return results;
}

function getUpcomingEvent(now: Date): { event: DetailedEvent; minutesUntil: number } | null {
  const day = getCampDay(now);
  if (!day) return null;

  const schedule = getDetailedSchedule(day);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the next event that starts in 8-12 minutes (so we notify ~10 min before)
  for (const event of schedule) {
    const eventMinutes = parseEventTime(event.time);
    if (eventMinutes === null) continue;
    const diff = eventMinutes - nowMinutes;
    if (diff >= 8 && diff <= 12) {
      return { event, minutesUntil: diff };
    }
  }
  return null;
}

function getBusEtas(): { busLabel: string; etaMin: number }[] {
  // Get latest waypoint per bus from last 10 minutes
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const rows = sqlite
    .prepare(
      `SELECT bus_id, bus_label, latitude, longitude, speed, timestamp
       FROM bus_waypoints
       WHERE timestamp > ?
       GROUP BY bus_id
       HAVING timestamp = MAX(timestamp)`
    )
    .all(cutoff) as BusWaypointRow[];

  const alerts: { busLabel: string; etaMin: number }[] = [];
  for (const row of rows) {
    if (row.speed == null || row.speed <= 0.5) continue;
    const dist = haversineDistanceMiles(
      row.latitude,
      row.longitude,
      CAMP_LOCATION.latitude,
      CAMP_LOCATION.longitude
    );
    const eta = estimateEtaMinutes(dist, row.speed);
    if (eta !== null && eta <= 15 && eta >= 3) {
      alerts.push({ busLabel: row.bus_label, etaMin: Math.round(eta) });
    }
  }
  return alerts;
}

export async function GET(request: NextRequest) {
  try {
    return await handleCron(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}

async function handleCron(request: NextRequest) {
  // Protect cron endpoint
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!setupVapid()) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }

  const now = new Date();
  let scheduleNotified = false;
  let busNotified = 0;

  // 1. Schedule notifications — send to all subscribers
  const upcoming = getUpcomingEvent(now);
  if (upcoming) {
    const { event, minutesUntil } = upcoming;
    const body = event.location
      ? `${event.title} at ${event.location} in ~${minutesUntil} min`
      : `${event.title} in ~${minutesUntil} min`;

    const payload = JSON.stringify({
      title: "Coming Up",
      body,
      url: "/schedule",
    });

    const allSubs = sqlite
      .prepare("SELECT id, endpoint, subscription_json, role FROM push_subscriptions")
      .all() as PushRow[];

    if (allSubs.length > 0) {
      await sendToSubscriptions(allSubs, payload);
      scheduleNotified = true;
    }
  }

  // 2. Bus ETA notifications — send to admin subscribers only
  const busAlerts = getBusEtas();
  if (busAlerts.length > 0) {
    const adminSubs = sqlite
      .prepare("SELECT id, endpoint, subscription_json, role FROM push_subscriptions WHERE role = 'admin'")
      .all() as PushRow[];

    if (adminSubs.length > 0) {
      for (const alert of busAlerts) {
        const payload = JSON.stringify({
          title: `${alert.busLabel} Arriving Soon`,
          body: `ETA ~${alert.etaMin} min to camp`,
          url: "/admin/bus-map",
        });
        await sendToSubscriptions(adminSubs, payload);
        busNotified++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    time: now.toISOString(),
    scheduleNotified,
    busAlerts: busNotified,
  });
}
