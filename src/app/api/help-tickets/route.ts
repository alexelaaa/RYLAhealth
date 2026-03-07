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

async function notifyAdmins(title: string, body: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails("mailto:admin@ryla5330.org", publicKey, privateKey);

    const adminSubs = sqlite
      .prepare("SELECT id, endpoint, subscription_json FROM push_subscriptions WHERE role = 'admin'")
      .all() as PushRow[];

    const payload = JSON.stringify({ title, body, url: "/admin/tickets" });

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
  } catch {
    // web-push not available or VAPID error — don't block ticket creation
  }
}

// GET: list tickets (admin sees all, DGL sees own)
export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") || "open";

  if (session.role === "admin" || session.role === "staff") {
    let tickets;
    if (status === "open") {
      // Show both open and acknowledged tickets in the "open" tab
      tickets = sqlite
        .prepare("SELECT * FROM help_tickets WHERE status IN ('open', 'acknowledged') ORDER BY CASE urgency WHEN 'urgent' THEN 0 ELSE 1 END, CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC")
        .all();
    } else {
      tickets = sqlite
        .prepare("SELECT * FROM help_tickets WHERE status = ? ORDER BY created_at DESC")
        .all(status);
    }
    return NextResponse.json(tickets);
  }

  // DGL sees their own tickets
  const dglName = (session.label || "").replace(/^DGL:\s*/, "").replace(/\s*\(.*\)$/, "");
  const tickets = sqlite
    .prepare("SELECT * FROM help_tickets WHERE dgl_name = ? ORDER BY created_at DESC")
    .all(dglName);
  return NextResponse.json(tickets);
}

// POST: create a new ticket (DGL only)
export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const { cabin, category, description, urgency } = await request.json();

    if (!category || !description?.trim()) {
      return NextResponse.json({ error: "Category and description required" }, { status: 400 });
    }

    const dglName = (session.label || "").replace(/^DGL:\s*/, "").replace(/\s*\(.*\)$/, "");
    const now = new Date().toISOString();

    // Ensure table exists (migration may not have run yet)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS help_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cabin TEXT NOT NULL,
        dgl_name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        urgency TEXT NOT NULL DEFAULT 'normal',
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to TEXT,
        resolved_by TEXT,
        resolved_note TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL
      )
    `);
    // Add assigned_to column if missing (table already existed)
    try { sqlite.exec("ALTER TABLE help_tickets ADD COLUMN assigned_to TEXT"); } catch { /* already exists */ }

    const result = sqlite
      .prepare(
        `INSERT INTO help_tickets (cabin, dgl_name, category, description, urgency, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?)`
      )
      .run(cabin || "", dglName, category, description.trim(), urgency || "normal", now);

    const ticketId = Number(result.lastInsertRowid);

    // Push notification to admins (non-blocking)
    const urgentPrefix = urgency === "urgent" ? "URGENT: " : "";
    await notifyAdmins(
      `${urgentPrefix}Help Request from ${dglName}`,
      `${cabin ? cabin + " — " : ""}${category}: ${description.trim().slice(0, 100)}`
    );

    return NextResponse.json({ id: ticketId, success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: resolve or update a ticket (admin only)
export async function PATCH(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || (session.role !== "admin" && session.role !== "staff")) {
    return NextResponse.json({ error: "Admin or Staff access required" }, { status: 403 });
  }

  try {
    const { id, status, note, assignedTo } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    // Ensure assigned_to column exists
    try { sqlite.exec("ALTER TABLE help_tickets ADD COLUMN assigned_to TEXT"); } catch { /* already exists */ }

    const now = new Date().toISOString();
    const resolvedBy = session.label || session.role;

    if (assignedTo !== undefined) {
      // Auto-acknowledge when assigning (if still open)
      const ticket = sqlite.prepare("SELECT status FROM help_tickets WHERE id = ?").get(id) as { status: string } | undefined;
      if (assignedTo && ticket?.status === "open") {
        sqlite
          .prepare("UPDATE help_tickets SET assigned_to = ?, status = 'acknowledged' WHERE id = ?")
          .run(assignedTo, id);
      } else {
        sqlite
          .prepare("UPDATE help_tickets SET assigned_to = ? WHERE id = ?")
          .run(assignedTo || null, id);
      }
    }

    if (status === "acknowledged") {
      sqlite
        .prepare("UPDATE help_tickets SET status = 'acknowledged' WHERE id = ?")
        .run(id);
    } else if (status === "resolved") {
      sqlite
        .prepare("UPDATE help_tickets SET status = 'resolved', resolved_by = ?, resolved_note = ?, resolved_at = ? WHERE id = ?")
        .run(resolvedBy, note || null, now, id);
    } else if (status === "open") {
      sqlite
        .prepare("UPDATE help_tickets SET status = 'open', resolved_by = NULL, resolved_note = NULL, resolved_at = NULL WHERE id = ?")
        .run(id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
