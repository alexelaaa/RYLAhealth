import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

const ALLOWED_ROLES = ["nurse", "staff", "admin"];

export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const weekend = searchParams.get("weekend");

  let query = db
    .select()
    .from(inventoryItems)
    .orderBy(desc(inventoryItems.createdAt))
    .$dynamic();

  if (weekend) {
    query = query.where(eq(inventoryItems.campWeekend, weekend)) as typeof query;
  }

  const results = query.all();
  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  const { itemName, category, quantity, size, unit, notes, campWeekend } = body;

  if (!itemName || quantity === undefined || quantity === null) {
    return NextResponse.json(
      { error: "itemName and quantity are required" },
      { status: 400 }
    );
  }

  const result = db
    .insert(inventoryItems)
    .values({
      itemName,
      category: category || null,
      quantity: parseInt(quantity),
      size: size || null,
      unit: unit || null,
      notes: notes || null,
      enteredBy: session.label || "Unknown",
      campWeekend: campWeekend || null,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
