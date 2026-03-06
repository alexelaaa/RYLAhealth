import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { sqlite } from "@/db";
import {
  getDetailedSchedule,
  type DetailedEvent,
} from "@/lib/schedule";
import { CAMP_LOCATION } from "@/lib/constants";
import { haversineDistanceMiles, estimateEtaMinutes } from "@/lib/geo-utils";

const CRON_SECRET = process.env.CRON_SECRET;

// Actual camp weekend dates (month is 0-indexed)
const CAMP_DATES = [
  { start: new Date(2026, 2, 6), end: new Date(2026, 2, 8) }, // March 6-8
  { start: new Date(2026, 4, 15), end: new Date(2026, 4, 17) }, // May 15-17
];

// Convert a UTC Date to Pacific time components
function toPacific(utcDate: Date): { year: number; month: number; day: number; hours: number; minutes: number; dayOfWeek: number } {
  const pacific = new Date(utcDate.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return {
    year: pacific.getFullYear(),
    month: pacific.getMonth(),
    day: pacific.getDate(),
    hours: pacific.getHours(),
    minutes: pacific.getMinutes(),
    dayOfWeek: pacific.getDay(),
  };
}

function isCampWeekend(now: Date): boolean {
  const pt = toPacific(now);
  const today = new Date(pt.year, pt.month, pt.day);
  return CAMP_DATES.some((d) => today >= d.start && today <= d.end);
}

interface PushRow {
  id: number;
  endpoint: string;
  subscription_json: string;
  role: string;
  user_label: string | null;
}

interface BusWaypointRow {
  bus_id: string;
  bus_label: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
}

interface DGLGroupInfo {
  smallGroup: string;
  largeGroup: string | null;
  meetingLocation: string | null;
}

// March activity rotations
const ACTIVITY_ROTATIONS: Record<string, string[]> = {
  Jungle:     ["XC Ski", "Spag Twr", "Boardwalk", "Egg Drop", "Capture"],
  Marine:     ["Capture", "XC Ski", "Spag Twr", "Boardwalk", "Egg Drop"],
  Arctic:     ["Egg Drop", "Capture", "XC Ski", "Spag Twr", "Boardwalk"],
  Desert:     ["Boardwalk", "Egg Drop", "Capture", "XC Ski", "Spag Twr"],
  Grasslands: ["Spag Twr", "Boardwalk", "Egg Drop", "Capture", "XC Ski"],
};

const ACTIVITY_FULL_NAMES: Record<string, string> = {
  "XC Ski": "Cross Country Skiing",
  "Spag Twr": "Spaghetti Tower",
  "Boardwalk": "Boardwalk",
  "Egg Drop": "Egg Drop",
  "Capture": "Capture the Flag",
  "Jeopardy": "Jeopardy",
};

const ACTIVITY_LOCATIONS: Record<string, string> = {
  "XC Ski": "Emerson Field",
  "Spag Twr": "Gilboa Hall",
  "Boardwalk": "Basketball Court",
  "Egg Drop": "Schlenz Hall",
  "Capture": "Emerson Field",
  "Jeopardy": "Schlenz Hall",
};

function setupVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:admin@ryla5330.org", publicKey, privateKey);
  return true;
}

function parseEventTime(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

async function sendToOne(row: PushRow, payload: string) {
  try {
    const sub = JSON.parse(row.subscription_json);
    await webpush.sendNotification(sub, payload);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      sqlite.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(row.id);
    }
  }
}

async function sendToSubscriptions(rows: PushRow[], payload: string) {
  await Promise.allSettled(rows.map((row) => sendToOne(row, payload)));
}

function getUpcomingEvent(now: Date): { event: DetailedEvent; minutesUntil: number } | null {
  // Use Pacific time for schedule matching
  const pt = toPacific(now);
  const dow = pt.dayOfWeek; // 0=Sun, 5=Fri, 6=Sat
  let day: "friday" | "saturday" | "sunday" | null = null;
  if (dow === 5) day = "friday";
  else if (dow === 6) day = "saturday";
  else if (dow === 0) day = "sunday";
  if (!day) return null;

  const schedule = getDetailedSchedule(day);
  const nowMinutes = pt.hours * 60 + pt.minutes;

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

function getDGLGroupInfo(userLabel: string): DGLGroupInfo | null {
  // Parse "DGL: FirstName LastName (Cabin 16C)" -> FirstName, LastName
  const nameMatch = userLabel.match(/^DGL:\s*(.+?)\s*\(/);
  if (!nameMatch) return null;
  const fullName = nameMatch[1].trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");

  try {
    const row = sqlite.prepare(
      `SELECT small_group, large_group, meeting_location FROM small_group_info
       WHERE dgl_first_name = ? AND dgl_last_name = ? LIMIT 1`
    ).get(firstName, lastName) as { small_group: string; large_group: string | null; meeting_location: string | null } | undefined;

    if (row) {
      return {
        smallGroup: row.small_group,
        largeGroup: row.large_group,
        meetingLocation: row.meeting_location,
      };
    }
  } catch { /* table may not exist */ }
  return null;
}

function buildDGLNotification(event: DetailedEvent, minutesUntil: number, info: DGLGroupInfo): string {
  const activityMatch = event.title.match(/^Activity\s+(\d+)$/);
  const isDiscussion = event.title.startsWith("Discussion Group");

  if (activityMatch && info.largeGroup) {
    const actIdx = parseInt(activityMatch[1], 10) - 1;
    const activities = ACTIVITY_ROTATIONS[info.largeGroup];
    if (activities && actIdx < activities.length) {
      const act = activities[actIdx];
      const fullName = ACTIVITY_FULL_NAMES[act] || act;
      const location = ACTIVITY_LOCATIONS[act] || "Activity Areas";
      return JSON.stringify({
        title: `Activity ${actIdx + 1} in ~${minutesUntil} min`,
        body: `${fullName} at ${location}`,
        url: "/cabin-checkin",
      });
    }
  }

  if (isDiscussion && info.meetingLocation) {
    return JSON.stringify({
      title: `${event.title} in ~${minutesUntil} min`,
      body: `Head to ${info.meetingLocation}`,
      url: "/cabin-checkin",
    });
  }

  // Generic fallback
  const body = event.location
    ? `${event.title} at ${event.location} in ~${minutesUntil} min`
    : `${event.title} in ~${minutesUntil} min`;
  return JSON.stringify({ title: "Coming Up", body, url: "/schedule" });
}

function getBusEtas(): { busLabel: string; etaMin: number }[] {
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
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    const queryKey = request.nextUrl.searchParams.get("key");
    if (auth !== `Bearer ${CRON_SECRET}` && queryKey !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!setupVapid()) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }

  const now = new Date();
  let scheduleNotified = false;
  let busNotified = 0;

  // Only send schedule notifications during actual camp weekends
  if (isCampWeekend(now)) {
    const upcoming = getUpcomingEvent(now);
    if (upcoming) {
      const { event, minutesUntil } = upcoming;

      const allSubs = sqlite
        .prepare("SELECT id, endpoint, subscription_json, role, user_label FROM push_subscriptions")
        .all() as PushRow[];

      if (allSubs.length > 0) {
        const isActivity = !!event.title.match(/^Activity\s+\d+$/);
        const isDiscussion = event.title.startsWith("Discussion Group");
        const needsPersonalization = isActivity || isDiscussion;

        // Generic payload for non-DGL subscribers
        const genericBody = event.location
          ? `${event.title} at ${event.location} in ~${minutesUntil} min`
          : `${event.title} in ~${minutesUntil} min`;
        const genericPayload = JSON.stringify({
          title: "Coming Up",
          body: genericBody,
          url: "/schedule",
        });

        // Cache DGL group lookups
        const dglCache = new Map<string, DGLGroupInfo | null>();

        await Promise.allSettled(
          allSubs.map(async (row) => {
            let payload = genericPayload;

            // Personalize for DGLs
            if (needsPersonalization && row.role === "dgl" && row.user_label) {
              if (!dglCache.has(row.user_label)) {
                dglCache.set(row.user_label, getDGLGroupInfo(row.user_label));
              }
              const info = dglCache.get(row.user_label);
              if (info) {
                payload = buildDGLNotification(event, minutesUntil, info);
              }
            }

            await sendToOne(row, payload);
          })
        );

        scheduleNotified = true;
      }
    }
  }

  // Bus ETA notifications — only during camp weekends too
  if (isCampWeekend(now)) {
    const busAlerts = getBusEtas();
    if (busAlerts.length > 0) {
      const adminSubs = sqlite
        .prepare("SELECT id, endpoint, subscription_json, role, user_label FROM push_subscriptions WHERE role = 'admin'")
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
  }

  return NextResponse.json({
    ok: true,
    time: now.toISOString(),
    isCampWeekend: isCampWeekend(now),
    scheduleNotified,
    busAlerts: busNotified,
  });
}
