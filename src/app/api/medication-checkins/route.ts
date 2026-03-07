import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campers, medicationCheckins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isNonEmpty } from "@/lib/medical-filters";

export async function GET(request: NextRequest) {
  const weekend = request.nextUrl.searchParams.get("weekend");

  let camperList;
  if (weekend) {
    camperList = db
      .select()
      .from(campers)
      .where(eq(campers.campWeekend, weekend))
      .all();
  } else {
    camperList = db.select().from(campers).all();
  }

  // Filter to campers who have real medication data
  const withMeds = camperList.filter(
    (c) => c.noShow !== 1 && c.sentHome !== 1 && isNonEmpty(c.currentMedications)
  );

  // Get all medication checkins
  const allCheckins = db.select().from(medicationCheckins).all();
  const checkinMap = new Map(allCheckins.map((ci) => [ci.camperId, ci]));

  const result = withMeds.map((c) => {
    const ci = checkinMap.get(c.id);
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      campWeekend: c.campWeekend,
      currentMedications: c.currentMedications,
      checkedInAt: ci?.checkedInAt || null,
      checkedInBy: ci?.checkedInBy || null,
      notes: ci?.notes || null,
      checkedOutAt: ci?.checkedOutAt || null,
      checkedOutBy: ci?.checkedOutBy || null,
      checkoutNotes: ci?.checkoutNotes || null,
    };
  });

  // Sort by last name
  result.sort((a, b) => a.lastName.localeCompare(b.lastName));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { camperId, action, notes } = body as {
    camperId: number;
    action: "checkin" | "checkout";
    notes?: string;
  };

  if (!camperId || !action) {
    return NextResponse.json(
      { error: "camperId and action are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Check if record exists
  const existing = db
    .select()
    .from(medicationCheckins)
    .where(eq(medicationCheckins.camperId, camperId))
    .get();

  if (action === "checkin") {
    if (existing) {
      db.update(medicationCheckins)
        .set({
          checkedInAt: now,
          checkedInBy: body.checkedBy || "nurse",
          notes: notes || existing.notes,
        })
        .where(eq(medicationCheckins.camperId, camperId))
        .run();
    } else {
      db.insert(medicationCheckins)
        .values({
          camperId,
          checkedInAt: now,
          checkedInBy: body.checkedBy || "nurse",
          notes: notes || null,
        })
        .run();
    }
  } else if (action === "checkout") {
    if (existing) {
      db.update(medicationCheckins)
        .set({
          checkedOutAt: now,
          checkedOutBy: body.checkedBy || "nurse",
          checkoutNotes: notes || existing.checkoutNotes,
        })
        .where(eq(medicationCheckins.camperId, camperId))
        .run();
    } else {
      db.insert(medicationCheckins)
        .values({
          camperId,
          checkedOutAt: now,
          checkedOutBy: body.checkedBy || "nurse",
          checkoutNotes: notes || null,
        })
        .run();
    }
  }

  return NextResponse.json({ success: true });
}
