import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, sqlite } from "@/db";
import { staffPins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

// GET: List all users (without pin hashes)
export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const users = db
    .select({
      id: staffPins.id,
      label: staffPins.label,
      role: staffPins.role,
    })
    .from(staffPins)
    .all();

  return NextResponse.json({ users });
}

// POST: Create a new user
export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { label, pin, role } = body;

  if (!label?.trim() || !pin?.trim() || !role) {
    return NextResponse.json({ error: "Label, PIN, and role are required" }, { status: 400 });
  }

  if (!["nurse", "staff", "admin", "bussing", "alumni"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check for duplicate label
  const existing = db.select().from(staffPins).where(eq(staffPins.label, label.trim())).get();
  if (existing) {
    return NextResponse.json({ error: "A user with that label already exists" }, { status: 409 });
  }

  try {
    const hash = hashSync(pin.trim(), 10);
    const result = db.insert(staffPins).values({
      label: label.trim(),
      pinHash: hash,
      role,
    }).run();

    return NextResponse.json({
      user: { id: Number(result.lastInsertRowid), label: label.trim(), role },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create user: ${message}` }, { status: 500 });
  }
}

// PUT: Update an existing user (change role or reset PIN)
export async function PUT(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { id, label, pin, role } = body;

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const existing = db.select().from(staffPins).where(eq(staffPins.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (label?.trim()) {
    sets.push("label = ?");
    values.push(label.trim());
  }
  if (role && ["nurse", "staff", "admin", "bussing", "alumni"].includes(role)) {
    sets.push("role = ?");
    values.push(role);
  }
  if (pin?.trim()) {
    sets.push("pin_hash = ?");
    values.push(hashSync(pin.trim(), 10));
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  values.push(id);
  sqlite.prepare(`UPDATE staff_pins SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.select({
    id: staffPins.id,
    label: staffPins.label,
    role: staffPins.role,
  }).from(staffPins).where(eq(staffPins.id, id)).get();

  return NextResponse.json({ user: updated });
}

// DELETE: Remove a user
export async function DELETE(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "");
  if (isNaN(id)) {
    return NextResponse.json({ error: "Valid ID required" }, { status: 400 });
  }

  db.delete(staffPins).where(eq(staffPins.id, id)).run();
  return NextResponse.json({ success: true });
}
