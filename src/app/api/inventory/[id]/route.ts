import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

const ALLOWED_ROLES = ["nurse", "staff", "admin"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const id = parseInt(params.id);
  const body = await request.json();

  const existing = db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.itemName !== undefined) updates.itemName = body.itemName;
  if (body.category !== undefined) updates.category = body.category;
  if (body.quantity !== undefined) updates.quantity = parseInt(body.quantity);
  if (body.size !== undefined) updates.size = body.size;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.notes !== undefined) updates.notes = body.notes;

  db.update(inventoryItems)
    .set(updates)
    .where(eq(inventoryItems.id, id))
    .run();

  const updated = db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const id = parseInt(params.id);

  db.delete(inventoryItems).where(eq(inventoryItems.id, id)).run();

  return NextResponse.json({ success: true });
}
