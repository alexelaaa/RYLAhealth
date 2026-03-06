import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

interface PushRow {
  id: number;
  endpoint: string;
  subscription_json: string;
}

async function notifyAll(title: string, body: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails("mailto:admin@ryla5330.org", publicKey, privateKey);

    const allSubs = sqlite
      .prepare("SELECT id, endpoint, subscription_json FROM push_subscriptions")
      .all() as PushRow[];

    const payload = JSON.stringify({ title, body, url: "/dashboard" });

    await Promise.allSettled(
      allSubs.map(async (row) => {
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
  } catch {
    // web-push not available
  }
}

// GET: fetch active announcements (any logged-in user)
export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Ensure table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      posted_by TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  // Admin sees all; others see only active
  const announcements = session.role === "admin"
    ? sqlite.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all()
    : sqlite.prepare("SELECT * FROM announcements WHERE active = 1 ORDER BY created_at DESC").all();

  return NextResponse.json(announcements);
}

// POST: create announcement (admin only)
export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { title, body, priority } = await request.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 });
    }

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        posted_by TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )
    `);

    const now = new Date().toISOString();
    const postedBy = session.label || session.role;

    const result = sqlite
      .prepare("INSERT INTO announcements (title, body, priority, posted_by, active, created_at) VALUES (?, ?, ?, ?, 1, ?)")
      .run(title.trim(), body.trim(), priority || "normal", postedBy, now);

    // Send push notification to everyone
    const prefix = priority === "urgent" ? "URGENT: " : "";
    await notifyAll(`${prefix}${title.trim()}`, body.trim().slice(0, 150));

    return NextResponse.json({ id: Number(result.lastInsertRowid), success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: toggle active/inactive (admin only)
export async function PATCH(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id, active } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  sqlite.prepare("UPDATE announcements SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
  return NextResponse.json({ success: true });
}

// DELETE: delete announcement (admin only)
export async function DELETE(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  sqlite.prepare("DELETE FROM announcements WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
