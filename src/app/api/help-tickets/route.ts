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

  if (session.role === "admin") {
    const tickets = sqlite
      .prepare("SELECT * FROM help_tickets WHERE status = ? ORDER BY CASE urgency WHEN 'urgent' THEN 0 ELSE 1 END, created_at DESC")
      .all(status);
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

  const result = sqlite
    .prepare(
      `INSERT INTO help_tickets (cabin, dgl_name, category, description, urgency, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`
    )
    .run(cabin || "", category, description.trim(), urgency || "normal", now);

  const ticketId = Number(result.lastInsertRowid);

  // Push notification to admins (non-blocking)
  const urgentPrefix = urgency === "urgent" ? "URGENT: " : "";
  await notifyAdmins(
    `${urgentPrefix}Help Request from ${dglName}`,
    `${cabin ? cabin + " — " : ""}${category}: ${description.trim().slice(0, 100)}`
  );

  return NextResponse.json({ id: ticketId, success: true }, { status: 201 });
}

// PATCH: resolve or update a ticket (admin only)
export async function PATCH(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id, status, note } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const resolvedBy = session.label || session.role;

  if (status === "resolved") {
    sqlite
      .prepare("UPDATE help_tickets SET status = 'resolved', resolved_by = ?, resolved_note = ?, resolved_at = ? WHERE id = ?")
      .run(resolvedBy, note || null, now, id);
  } else if (status === "open") {
    sqlite
      .prepare("UPDATE help_tickets SET status = 'open', resolved_by = NULL, resolved_note = NULL, resolved_at = NULL WHERE id = ?")
      .run(id);
  }

  return NextResponse.json({ success: true });
}
