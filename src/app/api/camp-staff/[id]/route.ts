import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db } from "@/db";
import { campStaff } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const staff = db.select().from(campStaff).where(eq(campStaff.id, id)).get();
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  return NextResponse.json({ staff });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = db.select().from(campStaff).where(eq(campStaff.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  const allowedFields = ["firstName", "lastName", "staffType", "staffRole", "phone", "email", "campWeekend", "notes"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = typeof body[field] === "string" ? body[field].trim() || null : body[field];
    }
  }

  db.update(campStaff).set(updates).where(eq(campStaff.id, id)).run();
  const staff = db.select().from(campStaff).where(eq(campStaff.id, id)).get();

  return NextResponse.json({ staff });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  db.delete(campStaff).where(eq(campStaff.id, id)).run();
  return NextResponse.json({ success: true });
}
