import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

const ALLOWED_ROLES = ["nurse", "staff", "admin"];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const campWeekend = formData.get("campWeekend") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const records = parseCSV(text);

  if (records.length === 0) {
    return NextResponse.json({ error: "CSV is empty or invalid" }, { status: 400 });
  }

  const headers = Object.keys(records[0]);
  const enteredBy = session.label || "CSV Import";
  let count = 0;

  // Check if this looks like the medical gear CSV format
  const isMedicalFormat =
    headers.includes("Brand") && headers.includes("Medication");

  // Check for generic format: Item Name, Quantity (minimum required)
  const hasItemName =
    headers.includes("Item Name") || headers.includes("item_name") || headers.includes("itemName");

  if (isMedicalFormat) {
    // Medical gear CSV format
    for (const row of records) {
      const brand = row["Brand"] || "";
      const medication = row["Medication"] || "";
      const strength = row["Strength / Contents"] || "";
      const lotNumber = row["Lot Number"] || "";
      const expDate = row["Expiration Date"] || "";
      const qtyRaw = row["Quantity"] || "1";
      const totalVolume = row["Total Volume / Amount"] || "";

      const qtyMatch = qtyRaw.match(/^(\d+)\s*(.*)$/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      const unit = qtyMatch ? qtyMatch[2].trim() : qtyRaw;

      const itemName = `${brand} ${medication}`.trim();
      if (!itemName) continue;

      const notesParts: string[] = [];
      if (strength) notesParts.push(`Strength: ${strength}`);
      if (totalVolume) notesParts.push(`Total: ${totalVolume}`);
      if (lotNumber) notesParts.push(`Lot: ${lotNumber}`);
      if (expDate) notesParts.push(`Exp: ${expDate}`);
      const notes = notesParts.join(" | ");

      db.insert(inventoryItems)
        .values({
          itemName,
          category: "Medical",
          quantity,
          size: null,
          unit: unit || null,
          notes: notes || null,
          enteredBy,
          campWeekend: campWeekend || null,
        })
        .run();
      count++;
    }
  } else if (hasItemName) {
    // Generic CSV format
    for (const row of records) {
      const itemName =
        row["Item Name"] || row["item_name"] || row["itemName"] || "";
      if (!itemName) continue;

      const qtyRaw = row["Quantity"] || row["quantity"] || row["Qty"] || "1";
      const quantity = parseInt(qtyRaw) || 1;

      db.insert(inventoryItems)
        .values({
          itemName,
          category: row["Category"] || row["category"] || null,
          quantity,
          size: row["Size"] || row["size"] || null,
          unit: row["Unit"] || row["unit"] || null,
          notes: row["Notes"] || row["notes"] || null,
          enteredBy,
          campWeekend: campWeekend || null,
        })
        .run();
      count++;
    }
  } else {
    return NextResponse.json(
      {
        error: `Unrecognized CSV format. Expected columns like "Item Name, Quantity" or "Brand, Medication". Found: ${headers.join(", ")}`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ imported: count });
}
