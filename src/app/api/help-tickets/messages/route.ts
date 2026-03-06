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
  user_label: string;
}

async function sendPush(subs: PushRow[], title: string, body: string, url: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || subs.length === 0) return;

  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails("mailto:admin@ryla5330.org", publicKey, privateKey);
    const payload = JSON.stringify({ title, body, url });

    await Promise.allSettled(
      subs.map(async (row) => {
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

// GET: fetch messages for a ticket
export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const ticketId = request.nextUrl.searchParams.get("ticketId");
  if (!ticketId) {
    return NextResponse.json({ error: "ticketId required" }, { status: 400 });
  }

  // Ensure table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES help_tickets(id),
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const messages = sqlite
    .prepare("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC")
    .all(Number(ticketId));

  return NextResponse.json(messages);
}

// POST: send a message on a ticket
export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { ticketId, message } = await request.json();
  if (!ticketId || !message?.trim()) {
    return NextResponse.json({ error: "ticketId and message required" }, { status: 400 });
  }

  // Ensure table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES help_tickets(id),
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const senderName = session.role === "dgl"
    ? (session.label || "").replace(/^DGL:\s*/, "").replace(/\s*\(.*\)$/, "")
    : session.label || session.role || "Staff";
  const senderRole = session.role || "staff";
  const now = new Date().toISOString();

  sqlite
    .prepare(
      "INSERT INTO ticket_messages (ticket_id, sender_name, sender_role, message, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(Number(ticketId), senderName, senderRole, message.trim(), now);

  // If admin/staff is messaging on an open ticket, auto-acknowledge it
  const ticket = sqlite.prepare("SELECT status, dgl_name FROM help_tickets WHERE id = ?").get(Number(ticketId)) as { status: string; dgl_name: string } | undefined;
  if (senderRole === "admin" || senderRole === "nurse" || senderRole === "staff") {
    if (ticket?.status === "open") {
      sqlite.prepare("UPDATE help_tickets SET status = 'acknowledged' WHERE id = ?").run(Number(ticketId));
    }
  }

  // Send push notifications
  if (senderRole === "dgl") {
    // DGL replied — notify admins
    const adminSubs = sqlite
      .prepare("SELECT id, endpoint, subscription_json, user_label FROM push_subscriptions WHERE role = 'admin'")
      .all() as PushRow[];
    await sendPush(adminSubs, `Reply from ${senderName}`, message.trim().slice(0, 100), "/admin/tickets");
  } else {
    // Staff/admin replied — notify the DGL who created the ticket
    if (ticket?.dgl_name) {
      const dglSubs = sqlite
        .prepare("SELECT id, endpoint, subscription_json, user_label FROM push_subscriptions WHERE role = 'dgl' AND user_label LIKE ?")
        .all(`%${ticket.dgl_name}%`) as PushRow[];
      await sendPush(dglSubs, `Message from ${senderName}`, message.trim().slice(0, 100), "/cabin-checkin");
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
