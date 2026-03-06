import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { sqlite } from "@/db";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

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
  if (senderRole === "admin" || senderRole === "nurse" || senderRole === "staff") {
    const ticket = sqlite.prepare("SELECT status FROM help_tickets WHERE id = ?").get(Number(ticketId)) as { status: string } | undefined;
    if (ticket?.status === "open") {
      sqlite.prepare("UPDATE help_tickets SET status = 'acknowledged' WHERE id = ?").run(Number(ticketId));
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
