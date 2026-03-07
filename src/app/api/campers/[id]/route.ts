import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db } from "@/db";
import { campers, medicalLogs, behavioralIncidents, camperEdits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

interface PushRow {
  id: number;
  endpoint: string;
  subscription_json: string;
  user_label: string;
}

async function notifyDGLsForCamper(camperId: number, camperName: string, reason: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  try {
    const { sqlite: db } = await import("@/db");

    // Get camper's cabin and small group
    const camper = db.prepare(
      "SELECT cabin_name, small_group FROM campers WHERE id = ?"
    ).get(camperId) as { cabin_name: string | null; small_group: string | null } | undefined;
    if (!camper) return;

    // Find DGL labels associated with this camper's cabin/group
    const dglLabels = new Set<string>();

    if (camper.small_group) {
      const groupInfo = db.prepare(
        "SELECT dgl_first_name, dgl_last_name, dgl_cabin FROM small_group_info WHERE small_group = ?"
      ).get(camper.small_group) as { dgl_first_name: string | null; dgl_last_name: string | null; dgl_cabin: string | null } | undefined;

      if (groupInfo?.dgl_cabin) {
        // DGL labels are formatted as "DGL - CabinName"
        const label = `DGL - ${groupInfo.dgl_cabin}`;
        dglLabels.add(label);
      }
    }

    if (camper.cabin_name) {
      // Also try to find DGLs whose cabin matches this camper's cabin
      const cabinDGLs = db.prepare(
        "SELECT dgl_cabin FROM small_group_info WHERE dgl_cabin IS NOT NULL"
      ).all() as { dgl_cabin: string }[];
      for (const row of cabinDGLs) {
        if (camper.cabin_name.includes(row.dgl_cabin) || row.dgl_cabin.includes(camper.cabin_name)) {
          dglLabels.add(`DGL - ${row.dgl_cabin}`);
        }
      }
    }

    if (dglLabels.size === 0) return;

    // Find push subscriptions for these DGLs
    const allDglSubs = db.prepare(
      "SELECT id, endpoint, subscription_json, user_label FROM push_subscriptions WHERE role = 'dgl'"
    ).all() as PushRow[];

    const matchingSubs = allDglSubs.filter((s) => dglLabels.has(s.user_label));
    if (matchingSubs.length === 0) return;

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails("mailto:admin@ryla5330.org", publicKey, privateKey);

    const payload = JSON.stringify({
      title: `Camper Sent Home: ${camperName}`,
      body: reason,
      url: `/campers/${camperId}`,
    });

    await Promise.allSettled(
      matchingSubs.map(async (row) => {
        try {
          const sub = JSON.parse(row.subscription_json);
          await webpush.sendNotification(sub, payload);
        } catch (err: unknown) {
          if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
            db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(row.id);
          }
        }
      })
    );
  } catch {
    // Push notifications are best-effort
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const camper = db
    .select()
    .from(campers)
    .where(eq(campers.id, id))
    .get();

  if (!camper) {
    return NextResponse.json({ error: "Camper not found" }, { status: 404 });
  }

  const medical = db
    .select()
    .from(medicalLogs)
    .where(eq(medicalLogs.camperId, id))
    .orderBy(desc(medicalLogs.timestamp))
    .all();

  const behavioral = db
    .select()
    .from(behavioralIncidents)
    .where(eq(behavioralIncidents.camperId, id))
    .orderBy(desc(behavioralIncidents.timestamp))
    .all();

  const edits = db
    .select()
    .from(camperEdits)
    .where(eq(camperEdits.camperId, id))
    .orderBy(desc(camperEdits.changedAt))
    .all();

  return NextResponse.json({
    camper,
    medicalLogs: medical,
    behavioralIncidents: behavioral,
    camperEdits: edits,
  });
}

// Editable fields (all camper fields that make sense to edit)
const EDITABLE_FIELDS = [
  "firstName", "lastName", "birthDate", "gender", "email", "cellPhone",
  "addressStreet", "addressCity", "addressState", "addressZip",
  "school", "gradeLevel",
  "guardianFirstName", "guardianLastName", "guardianEmail", "guardianPhone",
  "emergencyFirstName", "emergencyLastName", "emergencyRelationship", "emergencyPhone",
  "campWeekend", "campDateFlexibility", "role",
  "hasRelativeAttending", "relativeFirstName", "relativeLastName", "relativeRole",
  "dietaryRestrictions", "allergies", "currentMedications", "medicalConditions",
  "recentInjuries", "physicalLimitations", "lastTetanusShot", "otherMedicalNeeds",
  "hasInsurance", "insuranceProvider", "policyNumber",
  "insuredFirstName", "insuredLastName", "insurancePhone",
  "firstAidPermission", "otcMedicationPermission",
  "largeGroup", "smallGroup", "cabinName", "cabinLocation", "cabinNumber",
  "busNumber", "busStop", "busStopLocation", "busStopAddress", "pickupTime", "dropoffTime",
  "timedMedicationOverride", "medicationSchedule",
  "noShow",
  "sentHome", "sentHomeAt", "sentHomeBy", "sentHomeReason",
] as const;

// Map camelCase field names to snake_case column names
const FIELD_TO_COLUMN: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  birthDate: "birth_date",
  gender: "gender",
  email: "email",
  cellPhone: "cell_phone",
  addressStreet: "address_street",
  addressCity: "address_city",
  addressState: "address_state",
  addressZip: "address_zip",
  school: "school",
  gradeLevel: "grade_level",
  guardianFirstName: "guardian_first_name",
  guardianLastName: "guardian_last_name",
  guardianEmail: "guardian_email",
  guardianPhone: "guardian_phone",
  emergencyFirstName: "emergency_first_name",
  emergencyLastName: "emergency_last_name",
  emergencyRelationship: "emergency_relationship",
  emergencyPhone: "emergency_phone",
  campWeekend: "camp_weekend",
  campDateFlexibility: "camp_date_flexibility",
  role: "role",
  hasRelativeAttending: "has_relative_attending",
  relativeFirstName: "relative_first_name",
  relativeLastName: "relative_last_name",
  relativeRole: "relative_role",
  dietaryRestrictions: "dietary_restrictions",
  allergies: "allergies",
  currentMedications: "current_medications",
  medicalConditions: "medical_conditions",
  recentInjuries: "recent_injuries",
  physicalLimitations: "physical_limitations",
  lastTetanusShot: "last_tetanus_shot",
  otherMedicalNeeds: "other_medical_needs",
  hasInsurance: "has_insurance",
  insuranceProvider: "insurance_provider",
  policyNumber: "policy_number",
  insuredFirstName: "insured_first_name",
  insuredLastName: "insured_last_name",
  insurancePhone: "insurance_phone",
  firstAidPermission: "first_aid_permission",
  otcMedicationPermission: "otc_medication_permission",
  largeGroup: "large_group",
  smallGroup: "small_group",
  cabinName: "cabin_name",
  cabinLocation: "cabin_location",
  cabinNumber: "cabin_number",
  busNumber: "bus_number",
  busStop: "bus_stop",
  busStopLocation: "bus_stop_location",
  busStopAddress: "bus_stop_address",
  pickupTime: "pickup_time",
  dropoffTime: "dropoff_time",
  timedMedicationOverride: "timed_medication_override",
  medicationSchedule: "medication_schedule",
  noShow: "no_show",
  sentHome: "sent_home",
  sentHomeAt: "sent_home_at",
  sentHomeBy: "sent_home_by",
  sentHomeReason: "sent_home_reason",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();

  // Nurses can only toggle timedMedicationOverride and medicationSchedule
  if (session.role === "nurse") {
    const keys = Object.keys(body);
    const nurseAllowed = ["timedMedicationOverride", "medicationSchedule"];
    if (!keys.every((k) => nurseAllowed.includes(k))) {
      return NextResponse.json({ error: "Nurses can only modify timed medication settings" }, { status: 403 });
    }
  } else if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Fetch current camper
  const current = db
    .select()
    .from(campers)
    .where(eq(campers.id, id))
    .get();

  if (!current) {
    return NextResponse.json({ error: "Camper not found" }, { status: 404 });
  }

  // Diff and build updates
  const now = new Date().toISOString();
  const editRecords: { fieldName: string; oldValue: string | null; newValue: string | null }[] = [];

  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      let oldVal: string;
      let newVal: string;
      if (field === "medicationSchedule") {
        // medicationSchedule is stored as JSON string, body sends array
        oldVal = current[field] || "";
        newVal = Array.isArray(body[field]) ? JSON.stringify(body[field]) : String(body[field] ?? "");
      } else {
        oldVal = String(current[field] ?? "");
        newVal = String(body[field] ?? "");
      }
      if (oldVal !== newVal) {
        editRecords.push({
          fieldName: field,
          oldValue: oldVal || null,
          newValue: newVal || null,
        });
      }
    }
  }

  if (editRecords.length === 0) {
    return NextResponse.json({ camper: current, message: "No changes" });
  }

  // Insert audit records
  for (const edit of editRecords) {
    db.insert(camperEdits).values({
      camperId: id,
      fieldName: edit.fieldName,
      oldValue: edit.oldValue,
      newValue: edit.newValue,
      changedBy: session.label || session.role,
      changedAt: now,
    }).run();
  }

  // Build SET clause dynamically
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  for (const edit of editRecords) {
    const column = FIELD_TO_COLUMN[edit.fieldName];
    if (column) {
      setClauses.push(`${column} = ?`);
      if (edit.fieldName === "timedMedicationOverride" || edit.fieldName === "noShow" || edit.fieldName === "sentHome") {
        values.push(edit.newValue ? parseInt(edit.newValue) : 0);
      } else if (edit.fieldName === "medicationSchedule") {
        // Store JSON string for medication schedule array
        values.push(edit.newValue);
      } else {
        values.push(edit.newValue);
      }
    }
  }

  setClauses.push("updated_at = ?");
  values.push(now);
  values.push(id);

  const { sqlite } = await import("@/db");
  sqlite.prepare(
    `UPDATE campers SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);

  // Notify DGLs if camper was just sent home
  const sentHomeEdit = editRecords.find((e) => e.fieldName === "sentHome" && e.newValue === "1");
  if (sentHomeEdit) {
    const camperName = `${current.firstName} ${current.lastName}`;
    // Fire and forget — don't block the response
    notifyDGLsForCamper(id, camperName, "This camper is being sent home.").catch(() => {});
  }

  // Return updated camper
  const updated = db
    .select()
    .from(campers)
    .where(eq(campers.id, id))
    .get();

  return NextResponse.json({ camper: updated });
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

  const camper = db
    .select()
    .from(campers)
    .where(eq(campers.id, id))
    .get();

  if (!camper) {
    return NextResponse.json({ error: "Camper not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Record deletion audit entry (store camper name in old/newValue since camper row will be gone)
  db.insert(camperEdits).values({
    camperId: id,
    fieldName: "__deleted",
    oldValue: `${camper.firstName} ${camper.lastName}`,
    newValue: camper.campWeekend || null,
    changedBy: session.label || session.role,
    changedAt: now,
  }).run();

  // Delete related records first, then the camper (keep __deleted audit entry)
  const { sqlite } = await import("@/db");
  sqlite.prepare("DELETE FROM check_ins WHERE camper_id = ?").run(id);
  sqlite.prepare("DELETE FROM medical_logs WHERE camper_id = ?").run(id);
  sqlite.prepare("DELETE FROM behavioral_incidents WHERE camper_id = ?").run(id);
  sqlite.prepare("DELETE FROM camper_edits WHERE camper_id = ? AND field_name != '__deleted'").run(id);
  sqlite.prepare("DELETE FROM campers WHERE id = ?").run(id);

  return NextResponse.json({
    success: true,
    deleted: `${camper.firstName} ${camper.lastName}`,
  });
}
