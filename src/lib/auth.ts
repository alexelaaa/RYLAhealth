import { db } from "@/db";
import { staffPins } from "@/db/schema";
import { compareSync } from "bcryptjs";
import type { UserRole } from "@/types";

export async function verifyPin(
  pin: string
): Promise<{ valid: boolean; role: UserRole; label: string }> {
  const allPins = db.select().from(staffPins).all();

  for (const entry of allPins) {
    if (compareSync(pin, entry.pinHash)) {
      return { valid: true, role: entry.role as UserRole, label: entry.label };
    }
  }

  return { valid: false, role: "staff", label: "" };
}
