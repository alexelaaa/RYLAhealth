import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db } from "@/db";
import { campStaff } from "@/db/schema";
import { eq, like, or, asc, sql } from "drizzle-orm";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const weekend = searchParams.get("weekend");
  const type = searchParams.get("type");

  let query = db.select().from(campStaff).$dynamic();
  const conditions = [];

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(campStaff.firstName, term),
        like(campStaff.lastName, term),
        like(campStaff.staffRole, term)
      )
    );
  }

  if (weekend) {
    conditions.push(
      or(
        eq(campStaff.campWeekend, weekend),
        sql`${campStaff.campWeekend} IS NULL`,
        eq(campStaff.campWeekend, "")
      )
    );
  }

  if (type === "alumni" || type === "adult") {
    conditions.push(eq(campStaff.staffType, type));
  }

  if (conditions.length > 0) {
    const combined = conditions.reduce((acc, cond) => {
      if (!acc) return cond;
      return sql`${acc} AND ${cond}`;
    });
    if (combined) {
      query = query.where(combined) as typeof query;
    }
  }

  query = query.orderBy(asc(campStaff.lastName)) as typeof query;
  const results = query.all();

  return NextResponse.json({ staff: results });
}

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.firstName?.trim() || !body.lastName?.trim() || !body.staffType) {
    return NextResponse.json(
      { error: "First name, last name, and staff type are required" },
      { status: 400 }
    );
  }

  if (!["alumni", "adult"].includes(body.staffType)) {
    return NextResponse.json(
      { error: "Staff type must be 'alumni' or 'adult'" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const result = db
    .insert(campStaff)
    .values({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      staffType: body.staffType,
      staffRole: body.staffRole?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      campWeekend: body.campWeekend?.trim() || null,
      notes: body.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const id = Number(result.lastInsertRowid);
  const staff = db.select().from(campStaff).where(eq(campStaff.id, id)).get();

  return NextResponse.json({ staff }, { status: 201 });
}
