import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicalLogs, behavioralIncidents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

interface SyncItem {
  type: "medical" | "behavioral";
  clientId: string;
  data: Record<string, unknown>;
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const { items } = (await request.json()) as { items: SyncItem[] };

  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const results: { clientId: string; serverId: number; status: "created" | "duplicate" }[] = [];

  for (const item of items) {
    if (item.type === "medical") {
      // Check for duplicate
      if (item.clientId) {
        const existing = db
          .select()
          .from(medicalLogs)
          .where(eq(medicalLogs.clientId, item.clientId))
          .get();
        if (existing) {
          results.push({ clientId: item.clientId, serverId: existing.id, status: "duplicate" });
          continue;
        }
      }

      const result = db
        .insert(medicalLogs)
        .values({
          camperId: item.data.camperId as number,
          timestamp: item.data.timestamp as string,
          type: item.data.type as "medication_admin" | "first_aid" | "injury" | "illness" | "other",
          medication: (item.data.medication as string) || null,
          dosage: (item.data.dosage as string) || null,
          treatment: (item.data.treatment as string) || null,
          notes: (item.data.notes as string) || null,
          loggedBy: session.label || "Unknown",
          clientId: item.clientId,
        })
        .returning()
        .get();

      results.push({ clientId: item.clientId, serverId: result.id, status: "created" });
    } else if (item.type === "behavioral") {
      if (item.clientId) {
        const existing = db
          .select()
          .from(behavioralIncidents)
          .where(eq(behavioralIncidents.clientId, item.clientId))
          .get();
        if (existing) {
          results.push({ clientId: item.clientId, serverId: existing.id, status: "duplicate" });
          continue;
        }
      }

      const result = db
        .insert(behavioralIncidents)
        .values({
          camperId: item.data.camperId as number,
          timestamp: item.data.timestamp as string,
          staffName: item.data.staffName as string,
          description: item.data.description as string,
          severity: item.data.severity as "low" | "medium" | "high",
          loggedBy: session.label || "Unknown",
          clientId: item.clientId,
        })
        .returning()
        .get();

      results.push({ clientId: item.clientId, serverId: result.id, status: "created" });
    }
  }

  return NextResponse.json({ results });
}
